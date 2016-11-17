/*global console*/

define([
    'jquery',
    './lui.js',
    './template-util.js'
], function ($, Li, util) {

    function unwrap(str) {
        return Li.toMap(str.split(','), true);
    }

    var conflictingBindings = unwrap('if,ifnot,foreach,with,text,html'),
        disallowedCustomElementBindings = unwrap('if,ifnot,foreach,with,html');

    /**
     * @param {String|DocumentFragment} template If string, then it is better if the HTML is balanced, else it probably won't be correctly converted to DOM.
     * @param {Object} cfg
     * @param {Object} cfg.noConflict Will ensure Template doesn't conflict with KnockoutJS. i.e data-htmlizer attribute will be used and
     * containerless statements beginning and ending with "ko" prefix will be ignored.
     */
    function Template(template, cfg) {
        this.cfg = cfg;
        Object.assign(this, cfg);
        if (typeof template === 'string') {
            this.origTplStr = template;
            this.frag = util.moveToFragment(util.parseHTML(template));
        } else { //assuming DocumentFragment
            this.frag = template;
        }
        this.nodeInfoList = []; //list of nodes along with it's binding, depth, sub template etc.
        this.nodeMap = {}; //used to quickly map a node to it's nodeInfo.
        this.prepare();
    }

    Template.prototype = {
        /**
         * Identifies sub-templates, comment statement blocks and populates nodeInfoList and nodeMap.
         * @private
         */
        prepare: function () {
            var frag = this.frag,
                blocks = this.getVirtualBlocks(),
                blockNodes, tempFrag;
            Li.traverse(frag, frag, function (node, isOpenTag) {
                if (isOpenTag) {
                    var nodeInfo = {},
                        bindings;
                    if (node.nodeType === 1) { //element
                        var classRef = util.getClassFromNode(node),
                            bindOpts = node.getAttribute(this.noConflict ? 'data-htmlizer' : 'data-bind');
                        if (bindOpts) {
                            bindings = util.parseObjectLiteral(bindOpts);
                            this.checkForConflictingBindings(bindings, classRef);
                            nodeInfo.node = node;
                            //Convert ifnot: (...) to if: !(...)
                            if (bindings.ifnot) {
                                bindings['if'] = '!(' + bindings.ifnot + ')';
                                delete bindings.ifnot;
                            }
                            (['attr', 'css', 'style']).forEach(function (binding) {
                                util.forEachObjectLiteral(bindings[binding], function (subkey, value) {
                                    bindings[binding + '.' + subkey] = value;
                                });
                                bindings[binding] = null;
                            });
                            nodeInfo.bindings = bindings;
                            if (bindings.foreach || bindings['with'] || bindings['if']) {
                                tempFrag = util.moveToFragment(Li.slice(node.childNodes));
                                nodeInfo.subTpl = new Template(tempFrag, Object.assign({}, this.cfg));
                            }
                            this.setTNodeInfo(node, nodeInfo);
                        }

                        if (classRef) { //skip traversal of component custom element's inner elements
                            return 'continue';
                        }
                    }

                    //HTML comment node
                    if (node.nodeType === 8) {
                        var stmt = node.data.trim(), match;

                        //Ignore all containerless statements beginning with "ko" if noConflict = true.
                        if (this.noConflict && (/^(ko |\/ko$)/).test(stmt)) {
                            return;
                        }

                        var block = util.findBlockFromStartNode(blocks, node);
                        if (block) {
                            nodeInfo.node = node;
                            nodeInfo.block = block;
                            match = stmt.match(util.regex.commentStatment);
                            nodeInfo.bindings = {};
                            nodeInfo.bindings[match[1].trim()] = match[2];
                            if (block.key === 'foreach' || block.key === 'with' || block.key === 'if' || block.key === 'ifnot') {
                                blockNodes = util.getImmediateNodes(frag, block.start, block.end);
                                tempFrag = util.moveToFragment(blockNodes);
                                nodeInfo.subTpl = new Template(tempFrag, Object.assign({}, this.cfg));
                            }
                            this.setTNodeInfo(node, nodeInfo);
                        }
                    }
                }
            }, this);
        },

        /**
         * Set binding and other information for a given node in template DocumentFragment.
         */
        setTNodeInfo: function (node, info) {
            if (!this.nodeMap[Li.getUID(node)]) {
                this.nodeInfoList.push(info);
                this.nodeMap[Li.getUID(node)] = info;
            }
        },

        /**
         * Get binding and other information for a given node in template DocumentFragment.
         */
        getTNodeInfo: function (node) {
            return this.nodeMap[Li.getUID(node)];
        },

        /**
         * @param {Object} data
         */
        toDocumentFragment: function (data, context) {
            return (new Li.View(this, data, context)).toDocumentFragment();
        },

        /**
         * @param {Object} data
         */
        toString: function (data, context) {
            return (new Li.View(this, data, context)).toString();
        },

        /**
         * Go through HTML comment statements and determine the start and end node of each statement.
         * @private
         */
        getVirtualBlocks: function () {
            if (this.blocks) { //return cached copy
                return this.blocks;
            }
            var stack = [], //Keep track of ifs and fors
                blocks = [],
                block;

            //Before evaluating, determine the nesting structure for containerless statements.
            Li.traverse(this.frag, this.frag, function (node, isOpenTag) {
                //HTML comment node
                if (isOpenTag && node.nodeType === 8) {
                    var stmt = node.data.trim(), match;

                    //Ignore all containerless statements beginning with "ko" if noConflict = true.
                    if (this.noConflict && (/^(ko |\/ko$)/).test(stmt)) {
                        return;
                    }

                    if ((match = stmt.match(/^(?:ko|hz)[ ]+([^:]+):/))) {
                        stack.unshift({
                            key: match[1],
                            start: node
                        });
                    } else if ((match = stmt.match(/^\/(ko|hz)$/))) {
                        block = stack.shift();
                        if (block) {
                            block.end = node;
                            blocks.push(block);
                        } else {
                            console.warn('Extra end tag found.');
                        }
                    }
                }
            }, this);
            if (stack.length) {
                throw new Error('Missing end tag for ' + stack[0].start.data.trim());
            }
            this.blocks = blocks; //cache blocks.
            return blocks;
        },

        /**
         * @param {Object} bindings Bindings as string
         * @private
         */
        checkForConflictingBindings: function (bindings, isComponent) {
            var conflict = [];
            util.forEachObjectLiteral(bindings, function (binding) {
                if (isComponent) {
                    if (binding in disallowedCustomElementBindings) {
                        conflict.push(binding);
                    }
                } else if (binding in conflictingBindings) {
                    conflict.push(binding);
                }
            });

            if (isComponent && conflict.length) {
                throw new Error('Component custom element does not support the following bindings: if,ifnot,foreach,with and html.');
            } else if (conflict.length > 1) {
                throw new Error('Multiple bindings (' + conflict[0] + ' and ' + conflict[1] + ') are trying to control descendant bindings of the same element.' +
                    'You cannot use these bindings together on the same element.');
            }
        }

    };

    Template.util = util;

    Li.Template = Template;
    return Li;
});
