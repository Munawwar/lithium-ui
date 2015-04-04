define([
    './lui',
    'jquery',
    '../lib/lithium/src/lithium.pubsub',
    './Template',
    './Observable',
    'tpl!./Component.ko'
], function (Lui, $, Li) {

    /**
     * Base class for all components.
     */
    Lui.Component = Lui.extend('Lui.Component', Li.Publisher, {
        /**
         * Root (top most) element of this component
         * @readonly
         */
        el: null,
        /**
         * Outer render template
         * @param {Lui.Template|undefined} tpl
         * if undefined, then script tag in document with data-outer="<component type>" is searched.
         *
         * If instance of Lui.Template, then that is used directly.
         * Use Lui.findTemplate() to find and load a template (in a script tag) using attribute and type.
         */
        outerTpl: undefined,
        /**
         * Inner render template
         * @param {undefined|String|Lui.Template|null} tpl
         * if undefined, then script tag in document with data-outer="<component type>" is searched.
         *
         * If instance of Lui.Template, then that is used directly.
         * Use Lui.findTemplate() to find and load a template (in a script tag) using attribute and type.
         *
         * If null, then no template. Some components don't have different "inner" and "outer", (eg component with a single void tag like <input>).
         */
        innerTpl: undefined,
        /**
         * CSS class to use on {@link #el}.
         */
        cls: Lui.Observable(''),
        /**
         * Extra CSS class to be added by view
         */
        extraCls: Lui.Observable(''),
        /**
         * Inline CSS style to apply on {@link #el}.
         */
        //undefined because, empty string would cause empty style attribute to be rendered by htmlizer.
        style: undefined,

        //Note: afterExtend() and makeConfigFromView() cannot be static methods since they are taken from the prototype chain.

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
                innerTpl: element.innerHTML.trim() || undefined
            };
            Li.slice(element.attributes).forEach(function (attr) {
                if (attr.name === 'class') {
                    cfg.cls = attr.value;
                } else if (attr.name !== 'data-bind' && attr.name !== 'type') {
                    cfg[attr.name] = attr.value;
                }
            });
            if (cfg.innerTpl) {
                cfg.innerTpl = Li.dom(cfg.innerTpl);
            }
            return cfg;
        },

        constructor: function (cfg) {
            this.id = 'cmp-' + Lui.Component.getNewId();
            //Make own copy of observable from prototype.
            this._observables.forEach(function (prop) {
                var val = this[prop];
                this[prop] = val.isLuiObservableArray ? Lui.ObservableArray(val()) : Lui.Observable(val());
            }, this);
            this.set(cfg);
            this.view = (new Lui.Template.View(this.outerTpl, this));
        },
        /**
         * Set configuration. Call this.refresh to re-render this component with the new config.
         */
        set: function (cfg) {
            this.cfg = this.cfg || {};

            for (var prop in cfg) {
                var val = cfg[prop];
                if (val !== undefined) {
                    if (Lui.isObservable(this[prop]) && this.hasOwnProperty(prop)) {
                        this[prop](val);
                    } else {
                        this[prop] = val;
                    }
                }
            }

            //TODO: Is the ability to override inner template of a single instance needed?
            if (cfg.innerTpl) {
                this.innerTpl = new Lui.Template(cfg.innerTpl);
            }

            this.listeners = this.listeners || [];
            if (!Li.isArray(this.listeners)) {
                this.listeners = [this.listeners];
            }
        },
        /**
         * @returns {String} The CSS class to be used on el by {@link #render} method.
         * @protected
         */
        getCssClass: function () {
            var typeCls = this.type.toLowerCase().replace(/\./g, '-');
            return (typeCls + ' ' + this.cls() + ' ' + this.extraCls()).trim();
        },
        /**
         * @protected
         */
        renderSelf: function (target, childIndex) {
            target.insertBefore(this.view.render(), target.childNodes[childIndex]);
            this.el = $('#' + this.id, target)[0];
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
            /* If you call this method from blur event, then the removal of el
             * could cause a second blur event to fire.
             * Hence set this.el to null before removing from document*/
            var el = this.el;
            this.el = null;
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        },
        /**
         * Refresh component. This method can only be used after rendering.
         */
        refresh: function () {
            var el = this.el;
            if (el && el.parentNode) {
                this.render(el.parentNode, Li.childIndex(el));
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
         * Rebinds DOM event listeners.
         * @private
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
                        var context = listeners.scope || this;
                        Li.forEach(listeners, function (funcOrObj, prop) {
                            if (prop === 'scope') {
                                return;
                            }
                            if (prop[0] === '(' && prop.slice(-1) === ')') { //using css selector
                                if (this.el) {
                                    var $els = $(prop.slice(1, -1), this.el);
                                    bindToDom($els, funcOrObj, context);
                                }
                            } else if (Li.isFunction(funcOrObj)) {
                                if (prop[0] !== '$') { //root element event
                                    if (!funcOrObj._scoped_) {
                                        funcOrObj = listeners[prop] = Li.bind(funcOrObj, context);
                                        funcOrObj._scoped_ = true;
                                    }
                                    $(this.el).on(prop, funcOrObj);
                                }
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
                                        funcOrObj.scope = context;
                                        obj.attachListeners(funcOrObj);
                                    } else { //assume HTMLElement
                                        bindToDom($(obj), funcOrObj, context);
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
         *   $afterrender: function () { //this is a component event },
         *   click: function () { //this is a dom event },
         *   "(.navigation)": {
         *      click: function () { //this is a dom event }
         *   }
         * }
         */
        on: function (listeners, dontAttach) {
            //Push to this.listeners
            var pos = this.listeners.indexOf(listeners);
            if (pos < 0) {
                this.listeners.push(listeners);
                Li.forEach(listeners, function (funcOrObj, prop) {
                    if (prop === 'scope') {
                        return;
                    }
                    //if not css selector and value is an object
                    if (!(prop[0] === '(' && prop.slice(-1) === ')') && Li.isObject(funcOrObj)) { //find reference
                        //Find the property being referenced
                        var ns = prop, obj = this;
                        ns.split('.').forEach(function (part) {
                            if (obj && Li.isDefined(obj[part])) {
                                obj = obj[part];
                            } else {
                                obj = null;
                            }
                        });
                        if (obj && obj instanceof Lui.Component) {
                            funcOrObj.scope = listeners.scope || this;
                            obj.on(funcOrObj, true);
                        }
                    } else if (prop[0] === '$') { //component event
                        this.subscribe(prop, funcOrObj, listeners.scope || this);
                    }
                }, this);
                if (!dontAttach) {
                    this.attachListeners(listeners);
                }
            }
        },
        /**
         * Removes listeners
         */
        off: function (listeners) {
            //Push to this.listeners
            var pos = this.listeners.indexOf(listeners);
            if (pos > -1) {
                this.detachListeners(listeners);
                Li.forEach(listeners, function (funcOrObj, prop) {
                    if (prop === 'scope') {
                        return;
                    }
                    //if not css selector and value is an object
                    if (!(prop[0] === '(' && prop.slice(-1) === ')') && Li.isObject(funcOrObj)) { //find reference
                        //Find the property being referenced
                        var ns = prop, obj = this;
                        ns.split('.').forEach(function (part) {
                            if (obj && Li.isDefined(obj[part])) {
                                obj = obj[part];
                            } else {
                                obj = null;
                            }
                        });
                        if (obj && obj instanceof Lui.Component) {
                            obj.off(funcOrObj);
                        }
                    } else if (prop[0] === '$') { //component event
                        this.unsubscribe(prop, funcOrObj);
                    }
                }, this);
                this.listeners.splice(pos, 1);
            }
        },
        /**
         * Detach DOM events
         * @param {Object} [specificListeners] Specific listener object to detach. When not provided, detaches all listeners.
         * @private
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
                            if (this.el) {
                                var $els = $(prop.slice(1, -1), this.el);
                                Li.forEach(funcOrObj, function (fn, event) {
                                    $els.off(event, fn);
                                });
                            }
                        } else if (Li.isFunction(funcOrObj)) {
                            if (prop[0] !== '$') { //root element event
                                $(this.el).off(prop, funcOrObj);
                            }
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
        /**
         * Overrides Li.Publisher's trigger method.
         */
        trigger: function () {
            //Add $ to all event names if not exists.
            var args = Li.slice(arguments);
            if (args[0][0] !== '$') {
                args[0] = '$' + args[0];
            }
            this.super(args);
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
