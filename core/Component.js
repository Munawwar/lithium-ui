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
                cfg.addClass = element.getAttribute('class');
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
            this.super();

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
         * @param {Object} cfg Any property of the component can be set through this config. However cfg.addClasses, cfg.removeClasses etc are special configs.
         * @param {String} cfg.addClass A string of CSS classes to add to component root element's class attribute.
         * @param {String} cfg.removeClass A string of CSS classes to remove from component root element's class attribute.
         * @param {String} cfg.removeStyle A string of CSS style properties to remove from component root element's style attribute.
         */
        set: function (cfg) {
            /*Handle special configs*/
            if (cfg.removeClass) {
                this.removeClass(cfg.removeClass);
                delete cfg.removeClass;
            }
            if (cfg.removeStyle) {
                this.removeStyle(cfg.removeStyle);
                delete cfg.removeStyle;
            }
            if (cfg.addClass) {
                this.addClass(cfg.addClass);
                delete cfg.addClass;
            }

            if (cfg.innerTpl) { // Child elements
                this.innerTpl = new Li.Template(cfg.innerTpl);
                delete cfg.innerTpl;
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
         * Add CSS classes to element.
         * @param {String} classes CSS classes as string. If any class already exists, it won't be added.
         * @param {Li.Observable} [obs] Any observable. By default this is equal to this.cls.
         * Note: Make sure the observable controls the class attribute of the element (else this function won't give the desired outcome).
         */
        addClass: function (classes, obs) {
            obs = obs || this.cls;
            if (obs) {
                var existingClasses = {};
                //Added classes
                obs().split(' ').concat(classes.split(' ')).forEach(function (cls) {
                    existingClasses[cls.trim()] = 1;
                });
                //Generate new class attribute
                var newClasses = '';
                Li.forEach(existingClasses, function (v, cls) {
                    newClasses += cls + ' ';
                });
                obs(newClasses.trim());
            }
        },
        /**
         * Removes CSS classes from element.
         * @param {String} classes CSS classes as string.
         * @param {Li.Observable} [obs] Any observable. By default this is equal to this.cls.
         * Note: Make sure the observable controls the class attribute of the element (else this function won't give the desired outcome).
         */
        removeClass: function (classes, obs) {
            obs = obs || this.cls;
            if (obs) {
                var existingClasses = {};
                obs().split(' ').forEach(function (cls) {
                    existingClasses[cls.trim()] = 1;
                });
                //Remove classes
                classes.split(' ').forEach(function (cls) {
                    delete existingClasses[cls.trim()];
                });
                //Generate class attribute
                var newClasses = '';
                Li.forEach(existingClasses, function (v, cls) {
                    newClasses += cls + ' ';
                });
                obs(newClasses.trim());
            }
        },
        /**
         * Added styles from element.
         * @param {Object} styles Styles as object. Each key should be camel cased and value should be string.
         * @param {Li.Observable} [obs] Any observable. By default this is equal to this.style.
         * Note: Make sure the observable controls the style attribute of the element (else this function won't give the desired outcome).
         */
        addStyle: (function () {
            function toCssProp(m) {
                return '-' + m.toLowerCase();
            };
            return function (styles, obs) {
                obs = obs || this.style;
                if (obs) {
                    var existingStyles = Li.parseStyleAttribute(obs() || '');
                    Li.forEach(style, function (value, prop) {
                        prop = prop.replace(/[A-Z]/g, toCssProp);
                        existingStyles[prop] = value;
                    });
                    //Generate style attribute
                    var styleString = '';
                    Li.forEach(existingStyles, function (val, prop) {
                        styleString += prop + ': ' + val + '; ';
                    });
                    obs(styleString.trim()); //I have a feeling that this will cause background images
                    //to flicker since the style atribute gets re-written (if we start using bg images).
                }
            };
        }()),
        /**
         * Removes styles from element.
         * @param {String} styles Styles as string separated by space.
         * @param {Li.Observable} [obs] Any observable. By default this is equal to this.style.
         * Note: Make sure the observable controls the style attribute of the element (else this function won't give the desired outcome).
         */
        removeStyle: function (styles, obs) {
            obs = obs || this.style;
            if (obs) {
                var existingStyles = Li.parseStyleAttribute(obs() || '');
                styles.split(' ').forEach(function (style) {
                    delete existingStyles[style.trim()];
                });
                //Generate style attribute
                var styleString = '';
                Li.forEach(existingStyles, function (val, prop) {
                    styleString += prop + ': ' + val + '; ';
                });
                obs(styleString.trim());
            }
        },
        /**
         * @returns {String} The CSS class to be used on el by {@link #render} method.
         * @private
         */
        getCssClass: function () {
            var typeCls = this.type.toLowerCase().replace(/\./g, '-');
            return (typeCls + ' ' + this.cls()).trim();
        },
        /**
         * @protected
         */
        renderSelf: function (target, childIndex) {
            this.view.render(target, childIndex);
            this.el = target.querySelector('#' + this.id, target);
            Object.defineProperty(this.el, 'liComponent', {value: this});
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
                if (Li.isObject(funcOrObj)) { // reference
                    //Make unique signature (ignoring context/scope, since we ar enot going to allow a function on the
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
                    if (eventname[0] !== '$') { //if not pupsub event
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
            }
        }
    });

    return Li;
});
