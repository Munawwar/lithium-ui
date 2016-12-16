/*global console*/

define([
    'jquery',
    './base/lithium.pubsub.js',
    './Template.js',
    './Observable.js',
    './template-util.js',
    './util/js-object-literal-parse.js',
    './arrayDiff.js'
], function ($, Li, _1, _2, util, parseObjectLiteral, arrayDiff) {
    var saferEval = util.saferEval;

    Li.View = Li.extend(Li.Publisher, {
        /**
         * @param {Li.Template} template Li.Template instance
         * @param {Object} data Any data
         * @param {Object} context [Context] in which this view should run. Used internally.
         * @param {Li.View} [parentView] parent of this view. Used internally.
         */
        constructor: function View(template, data, context, parentView) {
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

            this.super(arguments);

            //Render the view in-memory, as Components and sub-components need to be constructed.
            this.toDocumentFragment();
        },

        bindingHandler: {
            componenttag: {
                init: function (node, tNode, ClassRef) {
                    node.innerHTML = tNode.innerHTML;
                    if (ClassRef) {
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
                        this.spliceForEachItems(tpl, node, 0, info.views ? info.views.length : 0, val.items, val.as);
                    }
                },
                /*
                 * Update binding using O(N) diff-patch algorithm (when N = length of old array + length of new array).
                 * If index and removeLength/newItems arguments are passed, then it will mostly
                 * do an effifient O(n) update (when n is number of items to insert+remove). If that
                 * is not possible then it falls back to diff-patch.
                 */
                update: function (node, binding, index, removeLength, newItems) {
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

                    //If index and removeLength and/or newItems present
                    //AND if we are sure that the expr evaluates to the same ObservableArray
                    //as used the last time, then do an efficient update (no need of diff-patch algo).
                    if (oldObserver && oldObserver === info.observer && Li.isNumber(index)) {
                        this.spliceForEachItems(tpl, node, index, removeLength, newItems || [], val.as);
                    } else if (!info.views || info.views.length === 0) { //then add & create them all
                        this.spliceForEachItems(tpl, node, 0, 0, val.items, val.as);
                    } else {
                        var oldArr = info.views.map(function (view) {
                            return view.context.$data;
                        });
                        var changes = arrayDiff(val.items, oldArr);
                        changes.forEach(function (change) {
                            if (change.replace) {
                                //TODO: Can we do this more efficiently by reusing DOM nodes?
                                this.spliceForEachItems(tpl, node, change.index, change.batch.length, change.batch, val.as);
                            } else if (change.insert) {
                                this.spliceForEachItems(tpl, node, change.index, 0, change.batch, val.as);
                            } else { //remove
                                this.spliceForEachItems(tpl, node, change.index, change.batch.length, [], val.as);
                            }
                        }, this);
                    }
                },
                sort: function (node, binding, indexes) {
                    var info = this.getNodeInfo(node);
                    if (info.views) {
                        var output = document.createDocumentFragment();

                        //Sort views
                        info.views = indexes.map(function (i) {
                            return info.views[i];
                        });

                        info.views.forEach(function (view) {
                            output.appendChild(view.toDocumentFragment()); //removes from document and appends to 'output'
                        });
                        if (node.nodeType === 1) {
                            node.appendChild(output);
                        } else if (node.nodeType === 8) {
                            //Render inner template and insert berfore this node.
                            node.parentNode.insertBefore(output, info.blockEndNode);
                        }
                    }
                }
            },
            //TODO: Deprecate 'with' binding.
            "with": {
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
            this.nodeMap = {};

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
                            //Order is important as data-bind of custom tag should override, data-bind of
                            //component root tag. Also Observable()s needs to track in the same order.
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

                this.trigger('retired');
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
         * @param {Object} context
         * @param {Number} index Index at which items are to be inserted/removed.
         * @param {Number} removeLength Number of items to remove
         * @param {Array} items Array of items to insert to index
         * @param {String} as Name reference for item
         */
        spliceForEachItems: function (template, node, opIndex, removeLength, items, as) {
            var info = this.getNodeInfo(node);
            info.views = info.views || [];

            if (removeLength) {
                info.views.splice(opIndex, removeLength).forEach(function (view) {
                    view.retire();
                }, this);
            }

            if (items.length) {
                var output = document.createDocumentFragment(),
                    viewAtInsertIndex = info.views[opIndex];

                items.forEach(function (item, index) {
                    var newContext = this.getNewContext(this.context, this.data);
                    //foreach special properties
                    newContext.$data = newContext.$rawData = item;
                    newContext.$index = Li.Observable(index + opIndex);

                    if (as) {
                        newContext[as] = item;
                        //Add to _as so that sub templates can access them.
                        newContext._as = newContext._as || [];
                        newContext._as.push([as, item]);
                    }

                    var view = new Li.View(template, this.data, newContext, this);

                    info.views.splice(index + opIndex, 0, view);

                    //..finally execute
                    output.appendChild(view.toDocumentFragment());
                }, this);

                if (viewAtInsertIndex) {
                    viewAtInsertIndex.firstChild.parentNode.insertBefore(output, viewAtInsertIndex.firstChild);
                } else {
                    if (node.nodeType === 1) {
                        node.appendChild(output);
                    } else if (node.nodeType === 8) {
                        //Render inner template and insert berfore this node.
                        node.parentNode.insertBefore(output, info.blockEndNode);
                    }
                }
            }

            //Update index of items that come after last inserted/removed value.
            for (var i = opIndex + items.length; i < info.views.length; i += 1) {
                info.views[i].context.$index(i);
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
         * Sets states such that Observable that are called from eval, can indentify what binding etc is being evaluated.
         * @private
         */
        evaluate: function (bindingSpecific, expr, node) {
            var old = Li.View.currentlyEvaluating;
            Li.View.currentlyEvaluating = this;

            this.currentlyEvaluating = {
                view: this,
                node: node,
                binding: bindingSpecific
            };

            var value = saferEval.call(this.getRootView(), expr, this.context, node);

            if (bindingSpecific ==='foreach') {
                var info = this.getNodeInfo(node);
                info.observer = Li.isObservableArray(value) ? value : null;
            }
            if (value && Li.isObservable(value)) {
                value = value();
            }

            Li.View.currentlyEvaluating = old;
            this.currentlyEvaluating = null;

            return value;
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
            var view = new Li.View(template, data, newContext, this),
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
    });

    return Li;
});
