/*global console*/

define([
    'jquery',
    './Template.js',
    './template-util.js',
    './util/js-object-literal-parse.js'
], function ($, Li, util, parseObjectLiteral) {
    /**
     * @param {Li.Template} template Li.Template instance
     * @param {Object} data Any data
     * @param {Object} context [Context] in which this view should run. Used internally.
     * @param {Li.View} [parentView] parent of this view. Used internally.
     */
    function View(template, data, context, parentView) {
        this.id = Li.uuid();
        this.tpl = template;
        this.data = data;
        this.context = context || {
            $parents: [],
            $root: data,
            $data: data,
            $rawData: data
        };
        this.parentView = parentView || null;

        //Track first and last child after render.
        this.fragment = null;
        this.firstChild = null;
        this.lastChild = null;

        this.nodeInfoList = []; //will contain the binding information for each node.
        this.nodeMap = {}; //used to quickly map a node to it's nodeInfo.

        this.components = [];
        this.componentMap = {};
        this.exprEvaluatorCache = {}; //cache function for each expression, so that it doesn't need to
        //be eval'ed all the time.

        this.retired = false;

        //Render the view in-memory, as Components and sub-components need to be constructed.
        this.toDocumentFragment();
    }

    var saferEval = util.saferEval;

    View.prototype = {

        bindingHandler: {
            componenttag: {
                init: function (node, tNode, ClassRef) {
                    node.innerHTML = tNode.innerHTML;
                    if (ClassRef) { //Create component instance from tag and config attribute.
                        var cfg = {}, cmp;
                        //Parse node to a config
                        if (ClassRef.prototype.makeConfigFromView) {
                            if (node.hasAttribute('config')) {
                                cfg = util.parseObjectLiteral(node.getAttribute('config'));
                                node.removeAttribute('config');
                                this.evaluateParams(cfg, node); //Convert values to right data type (like integers).
                            }
                            cfg = ClassRef.prototype.makeConfigFromView(node, cfg);
                        }
                        cfg.type = ClassRef.prototype.type;
                        cfg.parent = this.context.$root;

                        //Create instance from config
                        cmp = new ClassRef(cfg);
                        //Resolve reference using ref attribute
                        var ref = node.getAttribute('ref');
                        if (ref) {
                            this.createReference(ref, cmp);
                        }

                        //Add to components list for rendering later
                        this.components.push({cmp: cmp, node: node});
                        this.componentMap[Li.getUID(node)] = cmp;

                        return {domTraverse: 'continue'}; //ignore inner content
                    }
                }
            },
            component: {
                init: function (node, binding, tNode, blocks) {
                    if (node.nodeType === 8) {
                        var expr = this.getBindingExpr(node, binding).trim();
                        var val;
                        if (expr[0] === '{') {
                            var inner = util.parseObjectLiteral(expr);
                            val = {
                                ref: this.evaluate(binding, inner.ref, node),
                                config: inner.config || {}
                            };
                            this.evaluateParams(val.config, node); //Convert values to right data type (like integers).
                        } else {
                            val = {
                                ref: this.evaluate(binding, expr, node),
                                config: {}
                            };
                        }

                        var cmp = val.ref;
                        if (cmp instanceof Li.Component) {
                            cmp.set(Object.assign(val.config, {parent: this.context.$root}));

                            //Add to components list for rendering later
                            this.components.push({cmp: cmp, node: node});
                            this.componentMap[Li.getUID(node)] = cmp;
                        }

                        var block = util.findBlockFromStartNode(blocks, tNode);
                        return {ignoreTillNode: block.end};
                    }
                }
            },
            template: {
                init: function (node, binding, tNode, blocks) {
                    if (node.nodeType === 8) {
                        var expr = this.getBindingExpr(node, binding),
                            tpl = this.evaluate(binding, expr, node);
                        if (tpl) {
                            var view = this.makeView(tpl, this.context, this.data, node),
                                tempFrag = view.toDocumentFragment();
                            node.parentNode.insertBefore(tempFrag, node.nextSibling);
                        } else {
                            console.warn('Sub-template "' + expr.trim() + '" for component ' + this.context.$root.type + ' is undefined');
                        }
                        node.parentNode.removeChild(node);
                        var block = util.findBlockFromStartNode(blocks, tNode);
                        return {ignoreTillNode: block.end};
                    }
                }
            },
            "if": {
                init: function (node, binding) {
                    var expr = this.getBindingExpr(node, binding),
                        val = this.evaluate(binding, expr, node),
                        info = this.getNodeInfo(node),
                        view = info.views && info.views[0],
                        hasChanged = (!view && val); //first time attach

                    if (view) {
                        var isAttached = view.isAttachedToDOM();
                        hasChanged = ((val && !isAttached) || (!val && isAttached));
                    }

                    if (hasChanged) {
                        if (!view) { //if view not created, the create it.
                            var tpl = this.tpl.getTNodeInfo(info.tNode).subTpl;
                            view = this.makeView(tpl, this.context, this.data, node);
                        }

                        var tempFrag = view.toDocumentFragment(); //if rendered, move nodes from document to DocumentFragment

                        if (val) {
                            if (node.nodeType === 1) {
                                node.appendChild(tempFrag);
                            } else if (node.nodeType === 8) {
                                node.parentNode.insertBefore(tempFrag, node.nextSibling);
                            }
                        }
                    }
                },
                update: function (node, binding) {
                    return this.bindingHandler[binding].init.apply(this, arguments);
                }
            },
            foreach: {
                init: function (node, binding) {
                    var info = this.getNodeInfo(node),
                        tNodeInfo = this.tpl.getTNodeInfo(info.tNode),
                        expr = tNodeInfo.bindings[binding],
                        tpl = tNodeInfo.subTpl,
                        val;

                    if (typeof expr === 'string') {
                        val = {items: this.evaluate(binding, expr, node)};
                    } else {
                        var inner = expr;
                        val = {
                            items: this.evaluate(binding, inner.data, node),
                            as: inner.as.slice(1, -1) //strip string quote
                        };
                    }

                    if (tpl.frag.firstChild && val.items instanceof Array) {
                        this.appendForEachItems(tpl, node, 0, val.items, val.as);
                    }
                },
                update: function (node, binding) {
                    var info = this.getNodeInfo(node),
                        tNodeInfo = this.tpl.getTNodeInfo(info.tNode),
                        oldObserver = info.observer,
                        expr = tNodeInfo.bindings[binding],
                        tpl = tNodeInfo.subTpl,
                        val;

                    if (typeof expr === 'string') {
                        val = {items: this.evaluate(binding, expr, node)};
                    } else {
                        var inner = expr;
                        val = {
                            items: this.evaluate(binding, inner.data, node),
                            as: inner.as.slice(1, -1) //strip string quote
                        };
                    }

                    this.updateForEachItems(tpl, node, val.items, val.as);
                }
            },
            "with": { //FIXME: Remove with binding.
                init: function (node, binding, tNode) {
                    var tNodeInfo = this.tpl.getTNodeInfo(tNode),
                        expr = tNodeInfo.bindings[binding],
                        tpl = tNodeInfo.subTpl,
                        val = this.evaluate(binding, expr, node),
                        newContext = this.getNewContext(this.context, val);
                    if (tpl.frag.firstChild && val !== null && val !== undefined) {
                        var tempFrag = this.makeView(tpl, newContext, val, node).toDocumentFragment();
                        if (node.nodeType === 1) {
                            node.appendChild(tempFrag);
                        } else if (node.nodeType === 8) {
                            node.parentNode.insertBefore(tempFrag, node.nextSibling);
                        }
                    }
                }
            },
            text: {
                init: function (node, binding, tNode, blocks) {
                    var out = this.evaluationHelper(node, binding),
                        val = out.val;
                    node = out.node;
                    if (val === null || val === undefined) {
                        val = '';
                    }

                    if (node.nodeType === 1) {
                        $(node).empty();
                        node.appendChild(document.createTextNode(val));
                        if (tNode) {
                            return {domTraverse: 'continue'}; //KO ignores the inner content.
                        }
                    } else if (node.nodeType === 8) {
                        var nodeInfo = this.getNodeInfo(node),
                            startNode = nodeInfo.node,
                            endNode = nodeInfo.blockEndNode;
                        if (endNode) {
                            util.moveToFragment(util.getImmediateNodes(node.ownerDocument, startNode, endNode)); // discard content
                        }
                        node.parentNode.insertBefore(document.createTextNode(val), node.nextSibling);
                        if (blocks) {
                            var block = util.findBlockFromStartNode(blocks, tNode);
                            return {ignoreTillNode: block.end.previousSibling || block.end.parentNode};
                        }
                    }
                },
                update: function (node, binding) {
                    return this.bindingHandler[binding].init.apply(this, arguments);
                }
            },
            html: {
                init: function (node, binding) {
                    if (node.nodeType === 1) {
                        var expr = this.getBindingExpr(node, binding),
                            val = this.evaluate(binding, expr, node);
                        $(node).empty();
                        if (val !== undefined && val !== null && val !== '') {
                            var nodes = util.parseHTML(val + '');
                            if (nodes) {
                                var tempFrag = util.moveToFragment(nodes);
                                node.appendChild(tempFrag);
                            }
                        }
                    }
                },
                update: function () {
                    return this.bindingHandler.html.init.apply(this, arguments);
                }
            },
            attr: {
                init: function (node, bindingSpecific) {
                    if (node.nodeType === 1) {
                        var attr = bindingSpecific.split('.')[1],
                            out = this.evaluationHelper(node, bindingSpecific),
                            val = out.val;
                        node = out.node;
                        if (val || typeof val === 'string' || typeof val === 'number') {
                            node.setAttribute(attr, val + '');
                        } else { //undefined, null, false
                            node.removeAttribute(attr);
                        }
                    }
                },
                update: function (node, bindingSpecific) {
                    this.bindingHandler.attr.init.call(this, node, bindingSpecific);
                }
            },
            css: {
                init: function (node, bindingSpecific) {
                    if (node.nodeType === 1) {
                        var className = bindingSpecific.split('.')[1],
                            out = this.evaluationHelper(node, bindingSpecific),
                            val = out.val;
                        node = out.node;
                        if (val) {
                            $(node).addClass(className);
                        } else {
                            $(node).removeClass(className);
                        }
                    }
                },
                update: function (node, bindingSpecific) {
                    this.bindingHandler.css.init.call(this, node, bindingSpecific);
                }
            },
            style: (function () {
                function toCssProp(m) {
                    return '-' + m.toLowerCase();
                }
                return {
                    init: function (node, bindingSpecific) {
                        if (node.nodeType === 1) {
                            var prop = bindingSpecific.split('.')[1],
                                out = this.evaluationHelper(node, bindingSpecific),
                                val = out.val;
                            node = out.node;
                            if (val || typeof val === 'string' || typeof val === 'number') {
                                node.style.setProperty(prop.replace(/[A-Z]/g, toCssProp), val + '');
                            } else { //undefined, null, false
                                node.style.removeProperty(prop.replace(/[A-Z]/g, toCssProp));
                            }
                        }
                    },
                    update: function (node, bindingSpecific) {
                        this.bindingHandler.style.init.call(this, node, bindingSpecific);
                    }
                };
            }()),

            //Some of the following aren't treated as attributes by Knockout, but this is here to keep compatibility with Knockout.

            enable: {
                init: function (node, binding) {
                    //binding could be 'disable' or 'enable'
                    if (node.nodeType === 1) {
                        var out = this.evaluationHelper(node, binding),
                            val = out.val;
                        node = out.node;

                        var disable = (binding === 'disable' ? val : !val);
                        if (disable) {
                            node.setAttribute('disabled', 'disabled');
                        } else {
                            node.removeAttribute('disabled');
                        }
                    }
                },
                update: function () {
                    return this.bindingHandler.enable.init.apply(this, arguments);
                }
            },
            disable: {
                init: function () {
                    return this.bindingHandler.enable.init.apply(this, arguments);
                },
                update: function () {
                    return this.bindingHandler.enable.update.apply(this, arguments);
                }
            },
            checked: {
                init: function (node, binding) {
                    if (node.nodeType === 1) {
                        var out = this.evaluationHelper(node, binding),
                            val = out.val;
                        node = out.node;
                        if (val) {
                            node.setAttribute('checked', 'checked');
                            node.checked = true;
                        } else {
                            node.removeAttribute('checked');
                            node.checked = false;
                        }
                    }
                },
                update: function () {
                    return this.bindingHandler.checked.init.apply(this, arguments);
                }
            },
            value: {
                init: function (node, binding) {
                    if (node.nodeType === 1) {
                        var out = this.evaluationHelper(node, binding),
                            val = out.val;
                        node = out.node;
                        if (val === null || val === undefined) {
                            if (node.value !== '') { // avoid unnecessary text cursor change.
                                node.removeAttribute('value');
                                node.value = '';
                            }
                        } else if (node.value !== (val + '')) { // avoid unnecessary text cursor change.
                            node.setAttribute('value', val);
                            node.value = val;
                        }
                    }
                },
                update: function () {
                    return this.bindingHandler.value.init.apply(this, arguments);
                }
            },
            visible: {
                init: function (node, binding) {
                    if (node.nodeType === 1) {
                        var out = this.evaluationHelper(node, binding),
                            val = out.val;
                        node = out.node;
                        if (val) {
                            if (node.style.display === 'none') {
                                node.style.removeProperty('display');
                            }
                        } else {
                            node.style.setProperty('display', 'none');
                        }
                    }
                },
                update: function () {
                    return this.bindingHandler.visible.init.apply(this, arguments);
                }
            }
        },

        /**
         * Helper used within binding handlers.
         * @private
         */
        evaluationHelper: function (node, binding) {
            var expr = this.getBindingExpr(node, binding),
                val = this.evaluate(binding, expr, node),
                classRef = util.getClassFromNode(node);
            if (classRef) {
                var cmp = this.componentMap[Li.getUID(node)];
                node = cmp.el;
            }
            return {
                val: val,
                node: node
            };
        },

        /**
         * Renders View into a DocumentFragment and returns it.
         * @private
         */
        toDocumentFragment: function () {
            this.retired = false;

            if (this.firstChild) { //if already rendered,
                var ownerDocument = this.firstChild.ownerDocument;
                //remove from document, add to new DocumentFragment, if it has changed
                if (!(ownerDocument === this.fragment && ownerDocument.firstChild === this.firstChild &&
                    ownerDocument.lastChild === this.lastChild)) {
                    var nodes = util.getImmediateNodes(this.firstChild.ownerDocument, this.firstChild, this.lastChild, true);
                    this.fragment = util.moveToFragment(nodes, this.fragment);
                }
                return this.fragment;
            }

            var frag = this.tpl.frag,
                output = document.createDocumentFragment();

            this.nodeInfoList = []; //clear previous node info. View instance can only bind to one document fragment.

            //Evaluate
            var blocks = this.tpl.getVirtualBlocks(),
                //two stacks - one to keep track of ancestors while inserting content
                //to output fragment, and the other to keep track of ancestors on template.
                stack = [output],
                tStack = [frag],
                commentStack = [],
                ignoreTillNode = null;
            Li.traverse(frag, frag, function (tNode, isOpenTag) {
                if (!ignoreTillNode && isOpenTag) {
                    var node = tNode.cloneNode(false);
                    stack[stack.length - 1].appendChild(node);

                    var bindings, control;
                    if (node.nodeType === 1) { //element
                        stack.push(node);
                        tStack.push(tNode);

                        //Check for Li.Component custom tag.
                        var classRef = util.getClassFromNode(node);

                        bindings = (this.tpl.getTNodeInfo(tNode) || {}).bindings;
                        if (bindings) {
                            if (!classRef) {
                                node.removeAttribute(this.tpl.noConflict ? 'data-htmlizer' : 'data-bind');
                            }
                            this.setNodeInfo(node, {tNode: tNode});
                        }

                        var ret;

                        if (classRef) { //handle Li.Component custom tag
                            //First render component in-memory..
                            control = this.bindingHandler.componenttag.init.call(this, node, tNode, classRef);

                            //..then apply bindings of custom tag.
                            //Order is important as data-bind of custom tag should override,
                            //data-bind of component root tag.
                            Li.forEach(bindings || {}, function (expr, bindingSpecific) {
                                var binding = bindingSpecific.split('.')[0];
                                if (expr !== null && this.bindingHandler[binding]) {
                                    this.bindingHandler[binding].init.call(this, node, bindingSpecific);
                                }
                            }, this);

                            ret = control.domTraverse;
                        } else {
                            // check for 'ref' attribute and handle it.
                            var ref = node.getAttribute('ref');
                            if (ref) {
                                this.createReference(ref, node);
                                node.removeAttribute('ref');
                            }

                            //Apply bindings.
                            Li.forEach(bindings || {}, function (expr, bindingSpecific) {
                                var binding = bindingSpecific.split('.')[0];
                                if (expr !== null && this.bindingHandler[binding]) {
                                    control = this.bindingHandler[binding].init.call(this,
                                        node, bindingSpecific, tNode, blocks) || {};
                                    if (control.domTraverse) {
                                        ret = control.domTraverse;
                                    }
                                }
                            }, this);
                        }


                        if (ret) {
                            return ret;
                        }
                    } else if (node.nodeType === 8) { //HTML comment node
                        var stmt = node.data.trim();

                        //Ignore all containerless statements beginning with "ko" if noConflict = true.
                        if (this.tpl.noConflict && (/^(ko |\/ko$)/).test(stmt)) {
                            return;
                        }

                        //Add node to this.nodeInfoList[].
                        this.setNodeInfo(node, {tNode: tNode});

                        if ((/^(?:ko|hz) /).test(stmt)) {
                            commentStack.push(node);
                        } else if ((/^\/(?:ko|hz)$/).test(stmt)) {
                            var startNode = commentStack.pop();
                            this.setNodeInfo(startNode, {blockEndNode: node});
                            this.setNodeInfo(node, {blockStartNode: startNode});
                        }

                        bindings = (this.tpl.getTNodeInfo(tNode) || {}).bindings;
                        Li.forEach(bindings || {}, function (expr, bindingSpecific) {
                            var binding = bindingSpecific.split('.')[0];
                            if (expr !== null && this.bindingHandler[binding]) {
                                control = this.bindingHandler[binding].init.call(this,
                                    node, binding, tNode, blocks) || {};
                                if (control.ignoreTillNode) {
                                    ignoreTillNode = control.ignoreTillNode;
                                }
                            }
                        }, this);
                    }
                } else if (!isOpenTag) {
                    if (tNode.nodeType === 1 && tStack[tStack.length - 1] === tNode) {
                        stack.pop();
                        tStack.pop();
                    }
                    if (tNode === ignoreTillNode) {
                        ignoreTillNode = null;
                    }
                }
            }, this);

            //Remove Li.Component custom tag and render component in it's place, in-memory.
            this.components.forEach(function (item) {
                var parent = item.node.parentNode,
                    index = Li.childIndex(item.node);
                parent.insertBefore(item.cmp.view.toDocumentFragment(), parent.childNodes[index]);
                parent.removeChild(item.node);
            }, this);

            //Keep track of first and last child
            this.fragment = output;
            this.firstChild = output.firstChild;
            this.lastChild = output.lastChild;
            return output;
        },

        /**
         * Update view using the data bindings.
         */
        update: function (config) {
            if (Li.isObject(config)) {
                if (this.data instanceof Li.Component) {
                    this.data.set(config);
                } else {
                    $.extend(true, this.data, config);
                }
            }

            //var blocks = this.tpl.getVirtualBlocks();
            this.nodeInfoList.forEach(function (info) {
                var node = info.node,
                    tNode = info.tNode,
                    bindings = (this.tpl.getTNodeInfo(tNode) || {}).bindings;

                Li.forEach(bindings || {}, function (expr, bindingSpecific) {
                    var binding = bindingSpecific.split('.')[0];
                    if (expr !== null && this.bindingHandler[binding]) {
                        this.bindingHandler[binding].update.call(this, node, bindingSpecific);
                    }
                }, this);

                //Update sub-views (for if and foreach bindings).
                if (info.views) {
                    info.views.forEach(function (view) {
                        view.update();
                    });
                }
            }, this);
        },

        /**
         * Get all components used by this view and sub-views.
         */
        getComponents: function () {
            var components = this.components.map(function (o) {
                return o.cmp;
            });
            this.nodeInfoList.forEach(function (info) {
                if (info.views) {
                    info.views.forEach(function (view) {
                        components = components.concat(view.getComponents());
                    });
                }
            }, this);
            return components;
        },

        /**
         * Renders View and returns output as a string.
         */
        toString: function () {
            var frag = this.toDocumentFragment(),
                html = '';
            for (var node = frag.firstChild; node; node = node.nextSibling) {
                if (node.nodeType === 1) {
                    html += node.outerHTML;
                } else if (node.nodeType === 3) {
                    html += node.nodeValue || '';
                } else if (node.nodeType === 8) {
                    html += '<!-- ' + node.data.trim() + ' -->';
                }
            }
            return html;
        },

        /**
         * Returns true if view is attached to another DOM hierarchy.
         * Note: This doesn't necessarily mean the view is attached to window.document.
         */
        isAttachedToDOM: function () {
            return (this.firstChild.parentNode && this.firstChild.parentNode.nodeType !== 11);
        },

        /**
         * Removes view from document and marks this view as unused.
         */
        retire: function () {
            if (this.firstChild) {
                this.toDocumentFragment(); //if rendered, move nodes from document to DocumentFragment

                //Reset everything so that GC can free memory.
                this.fragment = null;
                this.firstChild = null;
                this.lastChild = null;

                this.nodeInfoList = []; //will contain the binding information for each node.
                this.nodeMap = {}; //used to quickly map a node to it's nodeInfo.

                this.components = [];
                this.componentMap = {};
            }
            this.retired = true;
        },

        /**
         * @private
         * @param {Node} node Node in View
         * @param {Node} tNode Corresponding Node in Template
         */
        setNodeInfo: function (node, nodeInfo) {
            var existingInfo = this.nodeMap[Li.getUID(node)];
            if (existingInfo) { //then merge the new info.
                Object.assign(existingInfo, nodeInfo);
            } else {
                nodeInfo.node = node;
                this.nodeInfoList.push(nodeInfo);
                this.nodeMap[Li.getUID(node)] = nodeInfo;
            }
        },

        /**
         * @private
         * @param {Node} node Node in View
         */
        getNodeInfo: function (node) {
            return this.nodeMap[Li.getUID(node)];
        },

        /**
         * Get the JS expression for a specific binding of a specific node of this View.
         */
        getBindingExpr: function (node, bindingSpecific) {
            var tNode = this.getNodeInfo(node).tNode;
            return this.tpl.getTNodeInfo(tNode).bindings[bindingSpecific];
        },

        /**
         * Resolves and creates a reference.
         *
         * If this function throws an error, then that means the reference couldn't be resolved and
         * is most likely that the one who wrote the template used a non-existant reference/path.
         *
         * @param {String} ref The path to component + property name to be created. Eg. 'inputEl', '../dropdownCmp.innerEl'
         *
         * One can use JS like '.' notation to create a reference inside a sub-property of a property.
         * Creating reference on a parent component  using '../' is also allowed.
         *
         * @param {Li.Component|HTMLElement} object The object to be referred. i.e the newly created property will point to the given object.
         * @private
         */
        createReference: function (ref, object) {
            if (ref) {
                var parent = this.context.$data,
                    parentContext = this.context;

                //Handle '../'s. Traverse up the parent chain.
                if (ref.startsWith('../')) {
                    var times = ref.split('../');
                    ref = times.pop();
                    times.forEach(function () {
                        if (parent instanceof Li.Component) {
                            parent = parent.parent;
                        } else {
                            parent = parentContext.$parentContext.$data;
                            parentContext = parentContext.$parentContext;
                        }
                    });
                }

                //Handle child referencing. Like 'component.el'.
                var rel = parent,
                    innerProps = ref.split('.');
                ref = innerProps.pop();
                innerProps.forEach(function (part) {
                    rel = rel[part];
                });

                //Finally..
                rel[ref] = object;
            }
        },

        /**
         * @private
         * @param {Template} template Template instance that contains the body of the foreach statement
         * @param {Node} node
         * @param {Number} index Index at which items are to be inserted/removed.
         * @param {Array} items Array of items to insert to index
         * @param {String} as Name reference for item
         */
        appendForEachItems: function (template, node, opIndex, items, as) {
            var info = this.getNodeInfo(node);
            info.views = info.views || [];

            if (items.length) {
                var output = document.createDocumentFragment();

                items.forEach(function (item, index) {
                    var newContext = this.getNewContext(this.context, this.data);
                    //foreach special properties
                    newContext.$data = newContext.$rawData = item;
                    newContext.$index = index + opIndex;

                    if (as) {
                        newContext[as] = item;
                        //Add to _as so that sub templates can access them.
                        newContext._as = newContext._as || [];
                        newContext._as.push([as, item]);
                    }

                    var view = new View(template, this.data, newContext, this);

                    info.views.splice(index + opIndex, 0, view);

                    //..finally execute
                    output.appendChild(view.toDocumentFragment());
                }, this);

                if (node.nodeType === 1) {
                    node.appendChild(output);
                } else if (node.nodeType === 8) {
                    //Render inner template and insert berfore this node.
                    node.parentNode.insertBefore(output, info.blockEndNode);
                }
            }
        },

        /**
         * @private
         * @param {Template} template Template instance that contains the body of the foreach statement
         * @param {Node} node
         * @param {Array} items Array of items to insert to index
         * @param {String} as Name reference for item
         */
        updateForEachItems: function (template, node, items, as) {
            var info = this.getNodeInfo(node);
            info.views = info.views || [];

            //Remove views if items have been removed from array.
            if (items.length < info.views.length) {
                var removeLength = info.views.length - items.length;
                info.views.splice(items.length, removeLength).forEach(function (view) {
                    view.retire();
                }, this);
            }

            //Update existing views.
            info.views.forEach(function (view, index) {
                var item = items[index],
                    context = view.context;

                //foreach special properties
                context.$data = context.$rawData = item;
                context.$index = index;

                if (as) {
                    context[as] = item;
                    //Add to _as so that sub templates can access them.
                    context._as = newContext._as || [];
                    context._as.pop();
                    context._as.push([as, item]);
                }

                view.update();
            }, this);

            //Add views if items have been added to array.
            if (items.length > info.views.length) {
                this.appendForEachItems(template, node, info.views.length, items.slice(info.views.length), as);
            }
        },

        /**
         * Recursively converts values of component 'config' parsed object to the right data type (like integers).
         * @param {Object} config Not a string. Make sure to convert config attribute to Object -> util.parseObjectLiteral(node.getAttribute('config'));
         * @param {HTMLELement} node
         * @private
         */
        evaluateParams: function (cfg, node) {
            Li.forEach(cfg, function (expr, key) {
                if (typeof expr === 'string') {
                    cfg[key] = saferEval.call(this.getRootView(), expr, this.context, node);
                } else { //object
                    this.evaluateParams(expr, node);
                }
            }, this);
        },

        /**
         * Evaluate a JS expression for a binding on a node.
         * @private
         */
        evaluate: function (bindingSpecific, expr, node) {
            return saferEval.call(this.getRootView(), expr, this.context, node);
        },

        /**
         * @private
         */
        getNewContext: function (parentContext, data) {
            var newContext = {
                $root: parentContext.$root,
                $parent: parentContext.$data,
                $parentContext: parentContext,
                $parents: ([data]).concat(parentContext.$parents),
                $data: data,
                $rawData: data
            };

            //Copy 'as' references from parent. This is done recursively, so it will have all the 'as' references from ancestors.
            if (parentContext._as) {
                newContext._as = parentContext._as.slice();
                newContext._as.forEach(function (tuple) {
                    newContext[tuple[0]] = tuple[1];
                });
            }
            return newContext;
        },

        /**
         * Used for making views with new context.
         * @private
         */
        makeView: function (template, newContext, data, node) {
            var view = new View(template, data, newContext, this),
                info = this.getNodeInfo(node);

            info.views = info.views || [];
            info.views.push(view);

            return view;
        },

        /**
         * Find the root View object.
         * Most View's are in fact sub-views/intermediate views. So this is useful for debugging as well.
         * @private
         */
        getRootView: function () {
            if (!this.rootView) {
                var root = this;
                while (root.parentView) {
                    root = root.parentView;
                }
                this.rootView = root;
            }
            return this.rootView;
        }
    };

    Li.View = View;
    return Li;
});
