define([
    './lui.js',
    'jquery',
    './base/lithium.pubsub.js',
    './View.js',
    './Observable.js',

    './Component.ko!tpl'
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
         * @type {Li.Template|undefined}
         * if undefined, then script tag in document with id="component-type-outer" is searched.
         *
         * If instance of Li.Template, then that is used directly.
         * Use Li.findTemplate() to find and load a template (in a script tag) using attribute and type.
         */
        outerTpl: undefined,
        /**
         * Inner render template
         * @type {Li.Template|DocumentFragment|undefined}
         * if undefined, then script tag in document with id="component-type-inner" is searched.
         *
         * If instance of Li.Template, then that is used directly.
         * Use Li.findTemplate() to find and load a template (in a script tag) using attribute and type.
         *
         * If null, then no template. Some components don't have different "inner" and "outer", (eg component with a single void tag like <input>).
         */
        innerTpl: undefined,

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
                tpl = Li.findTemplate('id', prefix + '-outer', true);
                if (tpl) { //not to override prototype, if template doesn't exist
                    proto.outerTpl = tpl;
                }
                tpl = Li.findTemplate('id', prefix + '-inner', false);
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
            Li.slice(element.attributes).forEach(function (attr) {
                var name = attr.name.toLowerCase();
                if (name === 'class') {
                    if (cfg.addClass) {
                        console.warn('Do not define params.addClass AND class attribute, both, on a component custom element.');
                    } else {
                        cfg.addClass = attr.value;
                    }
                } else if (name === 'style') {
                    if (cfg.addStyle) {
                        console.warn('Do not define params.addStyle AND style attribute, both, on a component custom element.');
                    } else {
                        cfg.addStyle = attr.value;
                    }
                } else if (Li.Component.ignoreAttributes.indexOf(name) < 0) {
                    cfg.addAttribute = cfg.addAttribute || {};
                    cfg.addAttribute[name] = cfg.addAttribute[name] || attr.value;
                }
            });

            $.extend(cfg, {
                innerTpl: element.innerHTML.trim() || undefined
            });
            if (cfg.innerTpl) {
                cfg.innerTpl = new Li.Template(cfg.innerTpl);
            }
            return cfg;
        },

        constructor: function (cfg) {
            this.super();

            //Do one-time/first-time initialization stuff.
            this.id = 'cmp-' + Li.Component.getNewId();

            //Add attributes
            this.outerTpl = this.outerTpl.cloneNode(true); //create clone so as to not modify prototype outerTpl
            cfg.addAttribute = cfg.addAttribute || {};
            cfg.addAttribute.id = this.id;
            cfg.addAttribute['data-type'] = this.type;

            var el = this.outerTpl.firstElementChild,
                cls = (Li.isString(cfg.cls) ? cfg.cls : el.getAttribute('class')) || '';
            cfg.cls = (this.type.toLowerCase().replace(/\./g, '-') + ' ' + cls).trim();

            //Make own copy of observable from prototype.
            this._observables.forEach(function (prop) {
                if (!this.hasOwnProperty(prop)) {
                    var val = this[prop];
                    this[prop] = Li.Observable(val());
                }
            }, this);
            this.listeners = {};

            //Set config
            this.set(cfg);

            //Render in-memory
            this.initializeView();

            this.attachListeners();
        },
        /**
         * Render in-memory.
         * @protected
         */
        initializeView: function () {
            var tpl = new Li.Template(this.outerTpl);
            this.view = new Li.View(tpl, this);
            this.el = this.view.fragment.firstElementChild;
            Object.defineProperty(this.el, 'liComponent', {value: this});
        },
        /**
         * Set configuration. Call this.refresh to re-render this component with the new config.
         *
         * @param {Object} cfg Any property of the component can be set through this config. However cfg.addClasses,
         * cfg.removeClasses etc are special configs.
         *
         * @param {String} cfg.addClass CSS classes to add to component's root element's class attribute.
         *
         * @param {String} cfg.addStyle CSS (inline) styles (in same format as a style attribute) to add to component's
         * root element's style attribute.
         *
         * @param {Object} cfg.addAttribute Attributes as key-value pairs, to be added to component's root element.
         * Each value must be a string or a number (numbers will be converted to string).
         *
         * @param {String} cfg.removeClass CSS classes to remove from component's root element's class attribute.
         *
         * @param {String} cfg.removeStyle A space separated string of CSS style property names to remove from component's
         * root element's style attribute.
         *
         * @param {String} cfg.removeAttribute Attribute names (as space separated string) to be removed from component's
         * root element.
         */
        set: function (cfg) {
            /*Handle special configs*/
            /* The reason for not using data-bind on root element of Component for handling some of these
             * is to avoid the hassle of adding common data-binds when a derived component overrides the
             * outerTpl/root element.
             */
            var el = this.el || this.outerTpl.firstElementChild;
            /* Order is important. Removal of attributes needs to be done before adding attributes to keep expectations.*/
            if (cfg.removeAttribute) {
                obj = {};
                (cfg.removeAttribute || '').split(' ').forEach(function (name) {
                    if (name) {
                        obj[name] = null;
                    }
                });
                delete cfg.removeAttribute.class;
                delete cfg.removeAttribute.style;
                $(el).attr(obj);
                delete cfg.removeAttribute;
            }
            if (cfg.addAttribute) {
                delete cfg.addAttribute.class;
                delete cfg.addAttribute.style;
                $(el).attr(cfg.addAttribute);
                delete cfg.addAttribute;
            }

            if (cfg.cls) {
                el.setAttribute('class', cfg.cls);
                delete cfg.cls;
            }
            if (cfg.style) {
                el.setAttribute('style', cfg.style);
                delete cfg.style;
            }
            /*Order is important. Removal of class and style needs to be done before adding class and style.*/
            if (cfg.removeClass) {
                $(el).removeClass(cfg.removeClass);
                delete cfg.removeClass;
            }
            var obj;
            if (cfg.removeStyle) {
                obj = {};
                (cfg.removeStyle || '').split(' ').forEach(function (name) {
                    if (name) {
                        obj[name] = null;
                    }
                });
                Li.style(el, obj);
                delete cfg.removeStyle;
            }
            if (cfg.addClass) {
                $(el).addClass(cfg.addClass);
                delete cfg.addClass;
            }
            if (cfg.addStyle) {
                obj = cfg.addStyle;
                if (typeof obj === 'string') {
                    obj = Li.parseStyleAttribute(obj);
                }
                Li.style(el, obj);
                delete cfg.addStyle;
            }

            //Handle the rest
            Object.keys(cfg).forEach(function (prop) {
                var val = cfg[prop];
                if (val !== undefined) {
                    if (this.hasOwnProperty(prop) && Li.isObservable(this[prop])) {
                        this[prop](val);
                    } else {
                        this[prop] = val;
                    }
                }
            }, this);
        },

        /**
         * Return's true if component's root element is rendered by browser.
         * i.e. methods like getComputedStyle() can be run on it without unexpected result.
         */
        isDisplayed: function () {
            return (this.el && Li.isDisplayed(this.el));
        },

        /**
         * Render component to target HTMLElement.
         */
        attach: function (target, childIndex) {
            //Store the root component being rendered
            if (!Li.Component.attachingRoot) {
                Li.Component.attachingRoot = this;
                target.insertBefore(this.view.toDocumentFragment(), target.childNodes[childIndex]);
            }
            //Call attach() on sub-components as well, since they may need to do some post-processing.
            this.view.getComponents().forEach(function (component) {
                component.attach(component.el.parentNode, Li.childIndex(component.el));
            });
            if (Li.Component.attachingRoot === this) {
                delete Li.Component.attachingRoot;
            }
        },
        /**
         * Remove this component from document.
         * Note: But it isn't removed from memory nor referenes to sub-components are removed.
         * The nodes will be reused on attach() call.
         * @protected
         */
        detach: function () {
            /* If you call this method from blur event, then the removal from document
             * could cause a second blur event to fire. Hence check if already removed, before removing from document*/
            if (this.el && this.el.parentNode && this.el.parentNode !== this.view.fragment) {
                this.view.toDocumentFragment(); //removes elements from DOM and keeps it in-memory.
            }
        },
        /**
         * Refresh component. This method can only be used after attaching.
         */
        refresh: function () {
            this.attach(this.el.parentNode, Li.childIndex(this.el));
        },

        /**
         * Converts an object of listeners linearly to a map from unique key => context bounded function.
         * If listeners.scope exist, it is used while binding, else uses 'this'.
         * Unique key = reference (if used) + eventname + UID of original function, all separated by '#'.
         *
         * If keysOnly=true, then returns an array of keys (so not a map, and no binding is done).
         * @private
         */
        unwrapListeners: function (listeners, keysOnly) {
            var unwrapedListeners = {},
                key;
            Li.forEach(listeners, function (funcOrObj, prop) {
                if (prop === 'scope') {
                    return;
                }
                if (prop.indexOf('#') > -1) { //if already unwrapped, then skip.
                    return (unwrapedListeners[prop] = funcOrObj);
                }
                if (Li.isObject(funcOrObj)) { // reference
                    //Make unique signature (ignoring context/scope, since we are not going to allow a function on the
                    //same event + same element to have two different contexts)
                    Li.forEach(funcOrObj, function (func, eventname) {
                        key = prop + '#' + eventname + '#' + Li.getUID(func);
                        unwrapedListeners[key] = keysOnly ? true : func.bind(listeners.scope || this);
                    }, this);
                } else if (Li.isFunction(funcOrObj)) { // DOM and pubsub listeners
                    key = prop + '#' +  Li.getUID(funcOrObj);
                    unwrapedListeners[key] = keysOnly ? true : funcOrObj.bind(listeners.scope || this);
                }
            }, this);
            return keysOnly ? Object.keys(unwrapedListeners) : unwrapedListeners;
        },
        /**
         * Rebinds DOM event listeners.
         * @param {Object} specificListeners A map from key => bounded function. Check unwrapListeners() method's
         * output to know what those mean.
         * @private
         */
        attachListeners: function (specificListeners) {
            specificListeners = specificListeners || this.listeners;

            this.detachListeners(Object.keys(specificListeners));
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
                            list[props.slice(1).join('#')] = func;
                            obj.attachListeners(list);
                        } else { //assume HTMLElement
                            $(obj).on(eventname, func);
                        }
                    }
                } else {
                    eventname = props[0];
                    if (eventname[0] !== '$') { //if not pupsub event, assume HTMLElement
                        $(this.el).on(eventname, func);
                    }
                }
            }, this);
        },
        /**
         * Adds listeners.
         *
         * @param {Object} listeners
         * There are two types of events: Component event and DOM events.
         * There are 3 different syntax to register events:
         * 1. Component event: Use "event name" => function () {...}, to register event on component. Note that this isn't DOM event.
         * 2. Reference: Add listeners to a property of this component. Use "propertyName": { <event handlers> }.
         * Property being referenced could be an instance of a component or a DOM element.
         *
         * Example:
         * {
         *   $afterrender: function () { //this is a component event },
         *   click: function () { //this is a dom event }
         * }
         * @param {Boolean} dontAttach If true, won't attach listeners to DOM. A call to this.attachListeners will be required to attach listeners to DOM.
         */
        on: function (listeners, dontAttach) {
            listeners = this.unwrapListeners(listeners);
            Li.forEach(listeners, function (func, key) {
                if (this.listeners[key]) {
                    return console.error('LUI doesn\'t allow one to use a function two times on the same event + the same element with two different bindings.');
                }
                this.listeners[key] = func;

                var props = key.split('#'),
                    ref, eventname;
                if (props.length > 2) { // a reference
                    ref = props[0];

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
                        list[props.slice(1).join('#')] = func;
                        obj.on(list, true);
                    }
                } else {
                    eventname = props[0];
                    if (eventname[0] === '$') { //component event
                        this.subscribe(eventname.slice(1), func);
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
        off: function (listeners, dontDetach) {
            var listenerKeys = this.unwrapListeners(listeners, true);

            //Detach DOM events first
            if (!dontDetach) {
                this.detachListeners(listenerKeys);
            }
            //Remove listener reference and pubsub events.
            listenerKeys.forEach(function (key) {
                var func = this.listeners[key];
                if (func) {
                    var props = key.split('#'),
                        ref, eventname;
                    if (props.length > 2) { // a reference
                        ref = props[0];

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
                            list[props.slice(1).join('#')] = func;
                            obj.off(list, true);
                        }
                    } else {
                        eventname = props[0];
                        if (eventname[0] === '$') { //component event
                            this.unsubscribe(eventname.slice(1), func);
                        }
                    }

                    delete this.listeners[key];
                }
            }, this);
        },
        /**
         * Detach DOM events
         * @param {Array} [specificListeners] Specific listener keys to detach. When not provided, detaches all listeners.
         * To know what keys are, check unwrapListeners() methods documentation.
         * @private
         */
        detachListeners: function (specificListeners) {
            specificListeners = specificListeners || Object.keys(this.listeners);

            specificListeners.forEach(function (key) {
                var func = this.listeners[key];
                if (func) {
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
                                obj.detachListeners([props.slice(1).join('#')]);
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
                }
            }, this);
        },

        statics: {
            id: 1,
            getNewId: function () {
                return Li.Component.id++;
            },
            /**
             * Ignore certain attributes.
             * @private
             */
            ignoreAttributes: ['data-i18n', 'ref']
        }
    });

    return Li;
});
