/*global $*/

define(['jquery', '../lib/lithium/src/lithium', '../lib/lithium/src/lithium.extras'], function ($, Li) {

    var Lui = {
        version: '0.1.0',

        /**
         * Holds all classes inherited through Lui.extend.
         * @private
         */
        componentClasses: {},

        /**
         * Read a static view implementation and return an array of component configs.
         * @param {HTMLElement} target HTMLElement that contains the view. Typically this is document.body.
         * @param {Object} parentCfg Config of parent component. So that this method can be used recursively to establish parent-child relationship.
         */
        makeConfigFromView: (function () {
            function unwrap(str) {
                var o = {};
                str.toUpperCase().split(',').forEach(function (val) {
                    o[val] = true;
                });
                return o;
            }
            var voidTags = unwrap('area,base,basefont,br,col,command,embed,frame,hr,img,input,keygen,link,meta,param,source,track,wbr'),
                componentTagRegex = /^(X|L)\-/;

            return function (target) {
                var comps = [], html = '';
                Lui.util.traverse(target, target, function (node, isOpenTag) {
                    if (node === target) {
                        return;
                    }
                    if (node.nodeType === 1) {
                        var tag = node.nodeName;
                        if (isOpenTag) {
                            if (componentTagRegex.test(tag)) {
                                if (html) {
                                    comps.push(html);
                                    html = '';
                                }
                                var className = tag.replace(/^X\-/, '')
                                        .replace(/^L\-/, 'Lui.')
                                        .replace(/-/g, '.'),
                                    classRef = this.getClass(className),
                                    cfg;
                                if (classRef.prototype.makeConfigFromView) {
                                    cfg = classRef.prototype.makeConfigFromView(node, cfg);
                                } else {
                                    cfg = {
                                        type: classRef.prototype.type
                                    };
                                }
                                comps.push(cfg);
                                return 'continue';
                            } else {
                                html += '<' + tag;
                                Li.slice(node.attributes).forEach(function (attr) {
                                    html += ' ' + attr.name + '="' + attr.value + '"';
                                });
                                html += (voidTags[tag] ? '/>' : '>');
                            }
                        } else if (!componentTagRegex.test(tag) && !voidTags[tag]) {
                            html += '</' + tag + '>';
                        }
                    }
                    if (isOpenTag && node.nodeType === 3) {
                        //escape <,> and &.
                        html += (node.nodeValue || '').replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").trim();
                    }
                }, this);
                if (html) {
                    comps.push(html);
                }
                return comps;
            };
        }()),

        /**
         * Pass an array of component configs, to return an array of initialized components.
         */
        create: function (ui, parent) {
            var created = [], cmp;
            ui.forEach(function (o) {
                if (Li.isString(o)) {
                    return created.push(o);
                }
                o.parent = parent;
                if (!(o instanceof Lui.Component)) {
                    o.type = o.type || 'Lui.Box';
                    var ClassRef = this.getClass(o.type);
                    cmp = new ClassRef(o);
                    if (o.ref && parent) {
                        var backsRegEx = /\.\.\//g,
                            backs = o.ref.match(backsRegEx);
                        o.ref = o.ref.replace(backsRegEx, '');

                        var rel = parent;
                        for (backs = (backs ? backs.length : 0); backs > 0; backs -= 1) {
                            rel = rel.parent;
                        }

                        rel[o.ref] = cmp;
                        delete cmp.ref;
                    }
                } else {
                    cmp = o;
                }
                created.push(cmp);
            }, this);
            return created;
        },

        /**
         * Render an array of components to a render target element.
         */
        render: function (ui, target, index) {
            if (!target) {
                if (console) {
                    console.error('Called Lui.render with undefined/null as target');
                }
                return null;
            }
            var html = '', components = [];
            ui.forEach(function (o) {
                if (Li.isString(o)) {
                    html += o;
                }
                if (o instanceof Lui.Component) {
                    html += '<!-- %%% -->';
                    components.push(o);
                }
            });

            var dom = Li.dom(html), placeHolders = [];
            Lui.util.traverse(dom, dom, function (node, isOpenTag) {
                if (isOpenTag && node.nodeType === 8 && node.data.trim() === '%%%') { //comment node
                    placeHolders.push(node);
                }
            }, this);

            target.insertBefore(dom, target.childNodes[index]);

            placeHolders.forEach(function (node, i) {
                components[i].render(node.parentNode, Lui.util.childIndex(node));
                $(node).remove();
            }, this);
        },

        /**
         * Get a class reference from list of registered classes.
         */
        getClass: function (type) {
            var classRef = this.componentClasses[type.toLowerCase()];
            if (!classRef) {
                throw new Error('Class does not exist');
            }
            return classRef;
        },

        /**
         * Uses Li.extend() to create the class using baseClass and proto, and at the same time
         * register the class type with Lui so that it can be used in HTML views parsed by Lui.
         * This automatically also adds the 'type' as a string to prototype of class (which Lui.Component uses in rendered markup).
         * @param {String} type Unique name (including namespace) to be used for the new class. eg 'Lui.Box'.
         * @param {Function} baseClass
         * @param {Object} proto Prototype to use for creating the new class.
         */
        extend: function (type, baseClass, protoObj) {
            protoObj.type = type;
            var typeLowerCase = type.toLowerCase();
            this.componentClasses[typeLowerCase] = Li.extend(baseClass, protoObj);

            var proto = this.getClass(typeLowerCase).prototype,
                P = function () {};
            P.prototype = proto;
            var inst = new P();
            if (Li.isFunction(inst.afterExtend)) {
                inst.afterExtend(proto);
            }
            return this.getClass(typeLowerCase);
        },

        /**
         * Finds template in script tag.
         * @private
         */
        findTemplate: function (attr, type) {
            var tpl = null,
                selector = 'script[' + attr + '="' + type + '"]',
                tplTag = $(selector);
            tplTag = tplTag[tplTag.length - 1];
            if (tplTag) {
                var text = tplTag.firstChild.nodeValue.trim();
                tpl = new Lui.util.Template(text);
            }
            return tpl;
        },

        /**
         * Recursively traverses through a given component's instance
         * (or a plain object with type properties) and child items.
         */
        traverse: function (component, callback, context) {
            var classRef = this.getClass(component.type);
            if (classRef === Lui.Box || (classRef.prototype instanceof Lui.Box)) {
                (component.items || []).forEach(function (item) {
                    if (!Li.isString(item)) {
                        callback.call(context, item);
                        Lui.traverse(item, callback, context);
                    }
                });
            }
        }
    };

    return Lui;
});
