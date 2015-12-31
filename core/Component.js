define([
    './lui',
    'jquery',
    './base/lithium.pubsub',
    './Template',
    './Observable',
    'tpl!./Component.ko'
], function (Li, $) {

    /**
     * Base class for all components.
     */
    Li.Component = Li.extend('Li.Component', Li.Publisher, {
        /**
         * Root (top most) element of this component
         * @readonly
         */
        el: null,
        /**
         * Outer render template
         * @param {Li.Template|undefined} tpl
         * if undefined, then script tag in document with id="component-type-outer" is searched.
         *
         * If instance of Li.Template, then that is used directly.
         * Use Li.findTemplate() to find and load a template (in a script tag) using attribute and type.
         */
        outerTpl: undefined,
        /**
         * Inner render template
         * @param {undefined|String|Li.Template|null} tpl
         * if undefined, then script tag in document with id="component-type-inner" is searched.
         *
         * If instance of Li.Template, then that is used directly.
         * Use Li.findTemplate() to find and load a template (in a script tag) using attribute and type.
         *
         * If null, then no template. Some components don't have different "inner" and "outer", (eg component with a single void tag like <input>).
         */
        innerTpl: undefined,
        /**
         * CSS class to use on {@link #el}.
         */
        cls: Li.Observable(''),
        /**
         * Extra CSS class to be added by view
         */
        extraCls: Li.Observable(''),
        /**
         * Inline CSS style to apply on {@link #el}.
         */
        style: Li.Observable(null),


        /**
         * Called after Li.extend() succeeds. Called exactly once for a class.
         * IMPORTANT Note: This method is used like a static method. So don't use 'this' keyword inside it.
         * @param {Object} proto Prototype object of this class.
         * @protected
         */
        //Note: afterExtend() and makeConfigFromView() cannot be static methods since they are taken from the prototype chain.
        afterExtend: function (proto) {
            var tpl;
            //Search for outerTpl and innerTpl script tags and initialize them if they exist. And then override prototype.
            // if Li.Component or extends Li.Component.
            //Note: When Li.Component is being created, it's afterExtend method is called before Li.Component is available in the Li namespace.
            //Therefore, use the Li.getClass() method.
            if (proto === Li.getClass('Li.Component').prototype || (proto instanceof Li.Component)) {
                var prefix = proto.type.toLowerCase().replace(/\./g, '-');
                tpl = Li.findTemplate('id', prefix + '-outer');
                if (tpl) { //not to override prototype, if template doesn't exist
                    proto.outerTpl = tpl;
                }
                tpl = Li.findTemplate('id', prefix + '-inner');
                if (tpl) {
                    proto.innerTpl = tpl;
                }
            }
        },
        /**
         * Read a <component> custom HTML element and generate corresponding component config.
         * IMPORTANT Note: This method is used like a static method. So don't use 'this' keyword inside it.
         * @param {HTMLElement} el Component's root element in the static view implementation.
         * @protected
         */
        //Note: afterExtend() and makeConfigFromView() cannot be static methods since they are taken from the prototype chain.
        makeConfigFromView: function (element, cfg) {
            //Accept standard HTML attributes like class and style
            if (element.hasAttribute('class')) {
                cfg.extraCls = element.getAttribute('class');
            }
            if (element.hasAttribute('style')) {
                cfg.style = element.getAttribute('style');
            }

            $.extend(cfg, {
                innerTpl: element.innerHTML.trim() || undefined
            });
            if (cfg.innerTpl) {
                cfg.innerTpl = Li.dom(cfg.innerTpl);
            }
            return cfg;
        },

        constructor: function (cfg) {
            this.id = 'cmp-' + Li.Component.getNewId();
            //Make own copy of observable from prototype.
            this._observables.forEach(function (prop) {
                if (!this.hasOwnProperty(prop)) {
                    var val = this[prop];
                    this[prop] = Li.Observable(val());
                }
            }, this);
            this.listeners = {};
            this.set(cfg);
            this.view = (new Li.Template.View(this.outerTpl, this));
            if (cfg.listeners) {
                this.on(cfg.listeners);
            }
        },
        /**
         * Set configuration. Call this.refresh to re-render this component with the new config.
         * @param {Object} cfg
         * @param {String} cfg.removeClasses A string of CSS classes to remove from component root element's class attribute.
         * @param {String} cfg.removeStyles A string of CSS properties to remove from component root element's style attribute.
         */
        set: function (cfg) {
            /*Handle special configs*/
            if (cfg.removeClasses) {
                var existingClasses = {};
                this.cls().split(' ').forEach(function (cls) {
                    existingClasses[cls.trim()] = 1;
                });
                //Remove classes
                cfg.removeClasses.split(' ').forEach(function (cls) {
                    delete existingClasses[cls.trim()];
                });
                //Generate class attribute
                var newClasses = '';
                Li.forEach(existingClasses, function (cls) {
                    newClasses += cls + ' ';
                });
                this.cls(newClasses.trim());
                delete cfg.removeClasses;
            }
            if (cfg.removeStyles) {
                var existingStyles = Li.parseStyleAttribute(this.style() || '');
                cfg.removeStyles.split(' ').forEach(function (style) {
                    delete existingStyles[style.trim()];
                });
                //Generate style attribute
                var style = '';
                Li.forEach(existingStyles, function (prop, val) {
                    style += prop + ': ' + val + '; ';
                });
                this.style(style.trim());
                delete cfg.removeStyles;
            }

            //TODO: Is the ability to override inner template of a single instance needed?
            if (cfg.innerTpl) {
                this.innerTpl = new Li.Template(cfg.innerTpl);
            }

            //Handle the rest
            for (var prop in cfg) {
                var val = cfg[prop];
                if (val !== undefined) {
                    if (Li.isObservable(this[prop]) && this.hasOwnProperty(prop)) {
                        this[prop](val);
                    } else {
                        this[prop] = val;
                    }
                }
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
        unwrapListeners: function (listeners) {
            var unwrapedListeners = {};
            Li.forEach(listeners, function (funcOrObj, prop) {
                if (Li.isObject(funcOrObj)) { // reference
                    //Identify unique listeners
                    Li.forEach(funcOrObj, function (func, eventname) {
                        func._uid_ = func._uid_ || Li.uuid();
                        unwrapedListeners[prop + '#' + eventname + '#' + func._uid_] = func;
                    }, this);
                } else if (Li.isFunction(funcOrObj)) { // DOM and pubsub listeners
                    funcOrObj._uid_ = funcOrObj._uid_ || Li.uuid();
                    unwrapedListeners[prop + '#' + funcOrObj._uid_] = funcOrObj;
                }
            }, this);
            return unwrapedListeners;
        },
        /**
         * Rebinds DOM event listeners.
         * @private
         */
        attachListeners: (function () {
            function bindToDom($el, event, key, func) {
                if (!func._scoped_) {
                    var newFunc = this.listeners[key] = Li.bind(func, this);
                    newFunc._scoped_ = true;
                    newFunc._uid_ = func._uid_;
                }
                $el.on(event, this.listeners[key]);
            }
            return function (specificListeners) {
                specificListeners = specificListeners || this.listeners;

                this.detachListeners(specificListeners);
                Li.forEach(specificListeners, function (func, key) {
                    var props = key.split('#'),
                        ref, eventname;
                    if (props.length > 2) { // a reference
                        ref = props[0];
                        eventname = props[1];

                        //Find the property being referenced
                        var ns = ref, obj = this;
                        ns.split('.').forEach(function (part) {
                            if (obj && Li.isDefined(obj[part])) {
                                obj = obj[part];
                            } else {
                                obj = null;
                            }
                        });

                        if (obj) {
                            if (obj instanceof Li.Component) {
                                var list = {};
                                list[eventname] = func;
                                obj.attachListeners(list);
                            } else { //assume HTMLElement
                                bindToDom.call(this, $(obj), eventname, key, func);
                            }
                        }
                    } else {
                        eventname = props[0];
                        if (eventname[0] !== '$') { //if not pupsub event
                            bindToDom.call(this, $(this.el), eventname, key, func);
                        }
                    }
                }, this);
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
         * @param {Boolean} dontAttach If true, won't attach listeners to DOM. A call to this.attachListeners will be required to attach listeners to DOM.
         */
        on: function (listeners, dontAttach) {
            listeners = this.unwrapListeners(listeners);
            Li.forEach(listeners, function (func, key) {
                this.listeners[key] = func;

                var props = key.split('#'),
                    ref, eventname;
                if (props.length > 2) { // a reference
                    ref = props[0];
                    eventname = props[1];

                    //Find the property being referenced
                    var ns = ref, obj = this;
                    ns.split('.').forEach(function (part) {
                        if (obj && Li.isDefined(obj[part])) {
                            obj = obj[part];
                        } else {
                            obj = null;
                        }
                    });

                    //Pass listeners to component references
                    if (obj && obj instanceof Li.Component) {
                        var list = {};
                        list[eventname] = func;
                        obj.on(list, true);
                    }
                } else {
                    eventname = props[0];
                    if (eventname[0] === '$') { //component event
                        this.subscribe(eventname, func, this);
                    }
                }
            }, this);
            if (!dontAttach) {
                this.attachListeners(listeners);
            }
        },
        /**
         * Removes listeners
         */
        off: function (listeners) {
            listeners = this.unwrapListeners(listeners);

            //Remove non-DOM events
            Li.forEach(listeners, function (func, key) {
                var props = key.split('#'),
                    ref, eventname;
                if (props.length > 2) { // a reference
                    ref = props[0];
                    eventname = props[1];

                    //Find the property being referenced
                    var ns = ref, obj = this;
                    ns.split('.').forEach(function (part) {
                        if (obj && Li.isDefined(obj[part])) {
                            obj = obj[part];
                        } else {
                            obj = null;
                        }
                    });

                    //Pass listeners to component references
                    if (obj && obj instanceof Li.Component) {
                        var list = {};
                        list[eventname] = func;
                        obj.off(list, true);
                    }
                } else {
                    eventname = props[0];
                    if (eventname[0] === '$') { //component event
                        this.unsubscribe(eventname, func, this);
                    }
                }

                delete this.listeners[key];
            }, this);
        },
        /**
         * Detach DOM events
         * @param {Object} [specificListeners] Specific listener object to detach. When not provided, detaches all listeners.
         * @private
         */
        detachListeners: function (specificListeners) {
            specificListeners = specificListeners || this.listeners;

            Li.forEach(specificListeners, function (func, key) {
                var props = key.split('#'),
                    ref, eventname;
                if (props.length > 2) { // a reference
                    ref = props[0];
                    eventname = props[1];

                    //Find the property being referenced
                    var ns = ref, obj = this;
                    ns.split('.').forEach(function (part) {
                        if (obj && Li.isDefined(obj[part])) {
                            obj = obj[part];
                        } else {
                            obj = null;
                        }
                    });

                    if (obj) {
                        if (obj instanceof Li.Component) {
                            var list = {};
                            list[eventname] = func;
                            obj.detachListeners(list);
                        } else { //assume HTMLElement
                            $(obj).off(eventname, func);
                        }
                    }
                } else {
                    eventname = props[0];
                    if (eventname[0] !== '$') { //if not pupsub event
                        $(this.el).off(eventname, func);
                    }
                }
            }, this);
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
                return Li.Component.id++;
            }
        }
    });

    return Li;
});
