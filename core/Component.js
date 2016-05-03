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
         * CSS class to use on root element.
         */
        cls: '',
        /**
         * Inline CSS style to apply to root element.
         */
        style: null,
        /**
         * Attributes to add to root element.
         */
        attributes: null,

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

            this.id = 'cmp-' + Li.Component.getNewId();
            this.cls = (this.type.toLowerCase().replace(/\./g, '-') + ' ' + this.cls).trim();

            //Make own copy of observable from prototype.
            this._observables.forEach(function (prop) {
                if (!this.hasOwnProperty(prop)) {
                    var val = this[prop];
                    this[prop] = Li.Observable(val());
                }
            }, this);
            this.listeners = {};
            this.set(cfg);

            //Render in-memory
            this.initalizeView();

            if (cfg.listeners) {
                this.on(cfg.listeners);
            }
        },
        /**
         * Render in-memory.
         * @protected
         */
        initalizeView: function () {
            this.view = (new Li.Template.View(this.outerTpl, this));
            this.el = this.view.fragment.querySelector('#' + this.id);
            Object.defineProperty(this.el, 'liComponent', {value: this});
            if (this.attributes) {
                this.setAttribute(this.attributes);
            }
        },
        /**
         * Set configuration. Call this.refresh to re-render this component with the new config.
         * @param {Object} cfg Any property of the component can be set through this config. However cfg.addClasses, cfg.removeClasses etc are special configs.
         * @param {String} cfg.addClass CSS classes to add to component's root element's class attribute.
         * @param {String} cfg.addStyle CSS (inline) styles (in same format as a style attribute) to add to component's root element's style attribute.
         * @param {Object} cfg.addAttribute Attributes as key-value pairs, to be added to component's root element. Each value must be a string or a number (numbers will be converted to string).
         * @param {String} cfg.removeClass CSS classes to remove from component's root element's class attribute.
         * @param {String} cfg.removeStyle A space separated string of CSS style property names to remove from component's root element's style attribute.
         * @param {String} cfg.removeAttribute Attribute names (as space separated string) to be removed from component's root element.
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
            if (cfg.removeAttribute) {
                var obj = {};
                (cfg.removeAttribute || '').split(' ').forEach(function (name) {
                    if (name) {
                        obj[name] = null;
                    }
                });
                this.setAttribute(obj);
                delete cfg.removeAttribute;
            }
            if (cfg.addClass) {
                this.addClass(cfg.addClass);
                delete cfg.addClass;
            }
            if (cfg.addStyle) {
                this.addStyle(cfg.addStyle);
                delete cfg.addStyle;
            }
            if (cfg.addAttribute) {
                this.setAttribute(cfg.addAttribute);
                delete cfg.addAttribute;
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
         * Add CSS classes to root element.
         * @param {String} classes CSS classes as string. If any class already exists, it won't be added.
         */
        addClass: function (classes) {
            var el = this.el || Li.Component.dummyEl;
            if (!this.el) {
                el.className = this.cls;
            }
            classes.split(' ').forEach(function (cls) {
                if (cls) {
                    el.classList.add(cls);
                }
            });
            if (!this.el) {
                this.cls = el.className;
            }
        },
        /**
         * Removes CSS classes from root element.
         * @param {String} classes CSS classes as string.
         */
        removeClass: function (classes) {
            var el = this.el || Li.Component.dummyEl;
            if (!this.el) {
                el.className = this.cls;
            }
            classes.split(' ').forEach(function (cls) {
                if (cls) {
                    el.classList.remove(cls);
                }
            }, this);
            if (!this.el) {
                this.cls = el.className;
            }
        },
        /**
         * Added styles from root element.
         * @param {String} styles Styles as a string. Format should be same as a CSS style attribute.
         */
        addStyle: (function () {
            function toCssProp(m) {
                return '-' + m.toLowerCase();
            }
            return function (styles) {
                var el = this.el || Li.Component.dummyEl;
                if (!this.el) {
                    el.setAttribute('style', this.style || '');
                }
                styles = Li.parseStyleAttribute(styles);
                Li.forEach(styles, function (value, prop) {
                    el.style.setProperty(prop.replace(/[A-Z]/g, toCssProp), value);
                }, this);
                if (!this.el) {
                    this.style = el.getAttribute('style') || null;
                }
            };
        }()),
        /**
         * Removes styles from root element.
         * @param {String} styles Styles as string separated by space.
         */
        removeStyle: (function () {
            function toCssProp(m) {
                return '-' + m.toLowerCase();
            }
            return function (styles) {
                var el = this.el || Li.Component.dummyEl;
                if (!this.el) {
                    el.setAttribute('style', this.style || '');
                }
                styles.split(' ').forEach(function (prop) {
                    if (prop) {
                        el.style.removeProperty(prop.replace(/[A-Z]/g, toCssProp));
                    }
                });
                if (!this.el) {
                    this.style = el.getAttribute('style') || null;
                }
            };
        }()),

        /**
         * Adds/removes attributes to/from root element.
         * @param {String} name Attribute name.
         * @param {String|Number|null} value Attribute value. If value is null, then attribute is removed.
         * @method setAttribute
         */
        /**
         * Adds/removes attributes to/from root element.
         * @param {Object} attributes Each key and value pair represents attribute name and value respectively. If value is null, then attribute is removed.
         */
        setAttribute: function (key, val) {
            var attributes = key;
            if (arguments.length === 2) {
                attributes = {};
                attributes[key] = val;
            }
            Li.forEach(attributes, function (value, name) {
                if (name && name !== 'class' && name !== 'style') {
                    if (typeof value === 'string' || typeof value === 'number') {
                        if (this.el) {
                            this.el.setAttribute(name, value + '');
                        } else {
                            this.attributes = this.attributes || {};
                            this.attributes[name] = value + '';
                        }
                    } else if (value === null) {
                        if (this.el) {
                            this.el.removeAttribute(name);
                        } else {
                            this.attributes = this.attributes || {};
                            this.attributes[name] = null;
                        }
                    }
                }
            }, this);
        },

        /**
         * Return's true if component's root element is rendered by browser.
         * i.e. methods like getComputedStyle() can be run on it without unexpected result.
         */
        isDisplayed: function () {
            return Li.isDisplayed(this.el);
        },

        /**
         * Render component to target HTMLElement.
         */
        render: function (target, childIndex) {
            //Store the root component being rendered
            if (!Li.Component.currentRootRender) {
                Li.Component.currentRootRender = this;
            }
            target.insertBefore(this.view.toDocumentFragment(), target.childNodes[childIndex]);
            if (Li.Component.currentRootRender === this) {
                delete Li.Component.currentRootRender;
            }
            this.postRender(target);
            this.trigger('afterrender', this);
        },
        /**
         * Remove this component from document.
         * Note: But it isn't removed from memory nor referenes to sub-components are removed.
         * The nodes will be reused on render() call.
         * @protected
         */
        detach: function () {
            /* If you call this method from blur event, then the removal from document
             * could cause a second blur event to fire. Hence check if already removed, before removing from document*/
            if (this.el && this.el.parentNode && this.el.parentNode !== this.view.fragment) {
                this.view.toDocumentFragment(); //removes elements from DOM and keeps it in-memory.
                //TODO: I think toDocumentFragment() on view's sub-views and unrender() child components, needs to be called as well?
            }
        },
        /**
         * Refresh component. This method can only be used after rendering.
         */
        refresh: function () {
            this.render(this.el.parentNode, Li.childIndex(this.el));
        },

        /**
         * Post render processing. Mainly attaching of listeners.
         * @protected
         */
        postRender: function (target) {
            if (!Li.Component.currentRootRender) { //recalc after root component has been rendered. This minimizes recalcs.
                window.flexRecalc(this.el);
            }
            this.attachListeners();
            this.view.getComponents().forEach(function (component) {
                component.postRender(target);
            });
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
            },
            /**
             * Ignore certain attributes.
             * @private
             */
            ignoreAttributes: ['data-i18n', 'ref'],
            dummyEl: Li.dom('<div></div>').firstChild
        }
    });

    return Li;
});
