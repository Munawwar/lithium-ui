define([
    './lui',
    'jquery',
    '../lib/lithium/src/lithium.observable',
    './util/Template',
    'tpl!./Component.ko'
], function (Lui, $, Li) {

    /**
     * Base class for all components.
     */
    Lui.Component = Lui.extend('Lui.Component', Li.Observable, {
        /**
         * Top most element of this component
         * @readonly
         */
        rootEl: null,
        /**
         * Outer render template
         * @param {Lui.util.Template|undefined} tpl
         * if undefined, then script tag in document with data-outer="<component type>" is searched.
         *
         * If instance of Lui.util.Template, then that is used directly.
         * Use Lui.findTemplate() to find and load a template (in a script tag) using attribute and type.
         */
        outerTpl: undefined,
        /**
         * Inner render template
         * @param {undefined|String|Lui.util.Template|null} tpl
         * if undefined, then script tag in document with data-outer="<component type>" is searched.
         *
         * If instance of Lui.util.Template, then that is used directly.
         * Use Lui.findTemplate() to find and load a template (in a script tag) using attribute and type.
         *
         * If null, then no template. Some components don't have different "inner" and "outer", (eg component with a single void tag like <input>).
         */
        innerTpl: undefined,
        /**
         * CSS class to use on {@link #rootEl}.
         */
        cls: '',
        /**
         * Extra CSS class to be added by view
         */
        extraCls: '',
        /**
         * Inline CSS style to apply on {@link #rootEl}.
         */
        //undefined because, empty string would cause empty style attribute to be rendered by htmlizer.
        style: undefined,
        /**
         * Called after Lui.extend() succeeds. Called exactly once for a class.
         * @param {Object} proto Prototype object of this class.
         * @protected
         */
        afterExtend: function (proto) {
            var tpl;
            //Search for outerTpl and innerTpl script tags and initialize them if they exist. And then override prototype.
            // if Lui.Component or extends Lui.Component.
            //Note: When Lui.Component is being created, it's afterExtend method is called before Lui.Component is available in the Lui namespace.
            //Therefore, use the Lui.getClass() method.
            if (proto === Lui.getClass('Lui.Component').prototype || (proto instanceof Lui.Component)) {
                tpl = Lui.findTemplate('data-outer', proto.type);
                if (tpl) { //not to override prototype, if template doesn't exist
                    proto.outerTpl = tpl;
                }
                tpl = Lui.findTemplate('data-inner', proto.type);
                if (tpl) {
                    proto.innerTpl = tpl;
                }
                this.stitchTpl(proto, {outer: proto.outerTpl, inner: proto.innerTpl});
            }
        },
        /**
         * @protected
         */
        stitchTpl: function (target, templates) {
            if (templates.outer && templates.inner) {
                var tpl = templates.outer.frag.cloneNode(true),
                    innerTpl = templates.inner.frag.cloneNode(true);
                tpl.firstChild.appendChild(innerTpl);
                target.tpl = new Lui.util.Template(tpl);
            } else if (templates.outer) {
                target.tpl = templates.outer;
            }
        },

        constructor: function (cfg) {
            this.id = 'cmp-' + Lui.Component.getNewId();
            this.set(cfg);
        },
        /**
         * Set configuration. Call this.refresh to re-render this component with the new config.
         */
        set: function (cfg) {
            this.cfg = this.cfg || {};
            $.extend(this, cfg);
            //TODO: Handle more overridden outerTpl. Or think about removing the ability to override templates.
            if (cfg.innerTpl) {
                this.stitchTpl(this, {outer: this.outerTpl, inner: this.innerTpl});
            } else if (this.hasOwnProperty('innerTpl')) {
                delete this.innerTpl;
                this.stitchTpl(this, {outer: this.outerTpl, inner: this.innerTpl});
            }

            this.listeners = this.listeners || [];
            if (!Li.isArray(this.listeners)) {
                this.listeners = [this.listeners];
            }
        },
        /**
         * Read a <component> HTML element and generate corresponding component config.
         * @param {HTMLElement} el Component's root element in the static view implementation.
         * @protected
         */
        makeConfigFromView: function (element) {
            var cfg = {
                type: this.type,
                id: element.id || undefined,
                cls: element.className || undefined,
                extraCls: element.getAttribute('extracls') || undefined,
                style: element.getAttribute('style') || undefined,
                ref: element.getAttribute('ref') || undefined,
                innerTpl: element.innerHTML.trim() || undefined
            };
            if (cfg.innerTpl) {
                cfg.innerTpl = new Lui.util.Template(cfg.innerTpl);
            }
            return cfg;
        },
        /**
         * @returns {String} The CSS class to be used on rootEl by {@link #render} method.
         * @protected
         */
        getCssClass: function () {
            var typeCls = this.type.toLowerCase().replace(/\./g, '-');
            return (typeCls + ' ' + this.cls + ' ' + this.extraCls).trim();
        },
        /**
         * @returns {Object}
         * To be used by {@link #getHtml} method.
         * @protected
         */
        getTemplateData: function () {
            return {
                id: this.id,
                type: this.type,
                cls: this.getCssClass() || '',
                style: this.style || '',
                inner: this.getInnerTemplateData()
            };
        },
        /**
         * @returns {Object}
         * To be used by {@link #getTemplateData} method.
         * @protected
         */
        getInnerTemplateData: function () {
            return {};
        },
        /**
         * @returns {DocumentFragment}
         * To be used by {@link #render} method.
         * @protected
         */
        getHtml: function () {
            return this.tpl.toDocumentFragment(this.getTemplateData());
        },
        /**
         * @protected
         */
        renderSelf: function (target, childIndex) {
            target.insertBefore(this.getHtml(), target.childNodes[childIndex]);
            this.rootEl = $('#' + this.id, target)[0];
        },
        /**
         * Render component to target HTMLElement.
         * @protected
         */
        render: function (target, childIndex) {
            this.unrender();
            this.renderSelf(target, childIndex);
            this.postRender(target);
            this.trigger('afterrender', this);
        },
        /**
         * Remove this component from document.
         * @protected
         */
        unrender: function () {
            /* If you call this method from blur event, then the removal of rootEl
             * could cause a second blur event to fire.
             * Hence store rootEl in temporary and set this.rootEl to null*/
            var rootEl = this.rootEl;
            this.rootEl = null;
            if (rootEl && rootEl.parentNode) {
                rootEl.parentNode.removeChild(rootEl);
            }
        },
        /**
         * Refresh component. This method can only be used after rendering.
         * This method can be overridden to avoid a complete re-render of markup for efficiency.
         */
        refresh: function () {
            var rootEl = this.rootEl;
            if (rootEl && rootEl.parentNode) {
                var childIndex = Li.slice(rootEl.parentNode.childNodes).indexOf(rootEl);
                this.render(rootEl.parentNode, childIndex);
            }
        },
        /**
         * @protected
         */
        refreshInner: function () {
            if (this.rootEl) {
                var inner = this.getInnerHtml();
                if (inner) {
                    $(this.rootEl).empty();
                    this.rootEl.appendChild(inner);
                }
            }
        },
        /**
         * Post render processing. Mainly attaching of listeners.
         * @protected
         */
        postRender: function (target) {
            this.attachListeners();
        },
        /**
         * Rebinds listeners.
         */
        attachListeners: (function () {
            function bindToDom($el, listeners, scope) {
                Li.forEach(listeners, function (fn, event) {
                    if (!fn._scoped_) {
                        fn = listeners[event] = Li.bind(fn, scope);
                        fn._scoped_ = true;
                    }
                    $el.on(event, fn);
                });
            }
            return function (specificListeners) {
                this.detachListeners(specificListeners);
                if (this.listeners) {
                    this.listeners.forEach(function (listeners) {
                        if (specificListeners && listeners !== specificListeners) {
                            return;
                        }
                        Li.forEach(listeners, function (funcOrObj, prop) {
                            if (prop === 'scope') {
                                return;
                            }
                            if (prop[0] === '(' && prop.slice(-1) === ')') { //using css selector
                                if (this.rootEl) {
                                    var $els = $(prop.slice(1, -1), this.rootEl);
                                    bindToDom($els, funcOrObj, listeners.scope || this);
                                }
                            } else if (Li.isFunction(funcOrObj)) { //component event
                                this.on(prop, funcOrObj, listeners.scope || this);
                            } else if (Li.isObject(funcOrObj)) { //find reference
                                //Find the property being referenced
                                var ns = prop, obj = this;
                                ns.split('.').forEach(function (part) {
                                    if (obj && Li.isDefined(obj[part])) {
                                        obj = obj[part];
                                    } else {
                                        obj = null;
                                    }
                                });
                                if (obj) {
                                    if (obj instanceof Lui.Component) {
                                        funcOrObj.scope = listeners.scope || this;
                                        obj.addListeners(funcOrObj);
                                    } else { //assume HTMLElement
                                        bindToDom($(obj), funcOrObj, listeners.scope || this);
                                    }
                                }
                            }
                        }, this);
                    }, this);
                }
            };
        }()),
        /**
         * Adds listeners.
         *
         * @param {Object} listeners
         * There are two types of events: Component event and DOM events.
         * There are 3 different syntax to register events:
         * 1. Component event: Use "event name" => function () {...}, to register event on component. Note that this isn't DOM event.
         * 2. Reference: Add listeners to a property of this component. Use "propertyName": { <event handlers> }.
         * Property being referenced could be an instance of a component or a DOM element.
         * 3. CSS selector: Use a CSS selector to find elements within this component's DOM, and attach events to them.
         * Place the CSS selector in paranthesis like so "(css selector)" => { <event handlers etc> }.
         *
         * Example:
         * {
         *   afterrender: function () { //this is a component event },
         *   "rootEl" : {
         *      click: function () { //this is a dom event }
         *   },
         *   "(.navigation)": {
         *      click: function () { //this is a dom event }
         *   }
         * }
         */
        addListeners: function (listeners) {
            //Push to this.listeners
            this.listeners.push(listeners);
            this.attachListeners(listeners);
        },
        /**
         * Removes listeners
         */
        removeListeners: function (listeners) {
            //Push to this.listeners
            var pos = this.listeners.indexOf(listeners);
            if (pos > -1) {
                this.detachListeners(listeners);
                this.listeners.splice(pos, 1);
            }
        },
        /**
         * @param {Object} [specificListeners] Specific listener object to detach. When not provided, detaches all listeners.
         */
        detachListeners: function (specificListeners) {
            if (this.listeners) {
                this.listeners.forEach(function (listeners) {
                    if (specificListeners && listeners !== specificListeners) {
                        return;
                    }
                    Li.forEach(listeners, function (funcOrObj, prop) {
                        if (prop === 'scope') {
                            return;
                        }
                        if (prop[0] === '(' && prop.slice(-1) === ')') { //using css selector
                            if (this.rootEl) {
                                var $els = $(prop.slice(1, -1), this.rootEl);
                                Li.forEach(funcOrObj, function (fn, event) {
                                    $els.off(event, fn);
                                });
                            }
                        } else if (Li.isFunction(funcOrObj)) { //component event
                            this.off(prop, funcOrObj);
                        } else if (Li.isObject(funcOrObj)) { //find reference
                            //Find the property being referenced
                            var ns = prop, obj = this;
                            ns.split('.').forEach(function (part) {
                                if (obj && Li.isDefined(obj[part])) {
                                    obj = obj[part];
                                } else {
                                    obj = null;
                                }
                            });
                            if (obj) {
                                if (obj instanceof Lui.Component) {
                                    obj.detachListeners(funcOrObj);
                                } else { //assume HTMLElement
                                    Li.forEach(funcOrObj, function (fn, event) {
                                        $(obj).off(event, fn);
                                    });
                                }
                            }
                        }
                    }, this);
                }, this);
            }
        },
        statics: {
            id: 1,
            getNewId: function () {
                return Lui.Component.id++;
            }
        }
    });

    return Lui;
});
