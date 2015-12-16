define(['jquery-node', './base/lithium'], function ($, Li) {

    /**
     * Create the class using baseClass and proto paramters.
     *
     * If type is sent as parameter, class type will be registered with Li as a component
     * so that it can be used in HTML views with custom tags.
     * This automatically also adds the 'type' as a string to prototype of class (which Li.Component uses in rendered markup).
     * @param {String} [type] Unique name (including namespace) to be used for the new class. eg 'Li.Box'.
     * If this paramter isn't passed, then the new class to be created is not treated as a component.
     * @param {Function} baseClass
     * @param {Object} proto Prototype to use for creating the new class.
     */
    Li.extend = (function () {
        var oldFunc = Li.extend;
        return function (type, baseClass, protoObj) {
            if (arguments.length < 3) {
                return oldFunc.apply(Li, arguments);
            }

            //If three parameters are given then the class is to be treated as a component.
            protoObj.type = type;
            var typeLowerCase = type.toLowerCase(),
                classRef = oldFunc.call(Li, baseClass, protoObj);
            this.componentClasses[typeLowerCase] = classRef;

            var proto = classRef.prototype,
                P = function () {};
            P.prototype = proto;
            var inst = new P();

            //Find all observables from prototype and note them down in _observables.
            //A Component instance can use _observables to make it's own copy of these observables.
            proto._observables = [];
            for (var prop in inst) {
                if (Li.isObservable(inst[prop])) {
                    proto._observables.push(prop);
                }
            }

            if (Li.isFunction(inst.afterExtend)) {
                inst.afterExtend(proto);
            }
            return classRef;
        };
    }());

    Li.mix(Li, {
        uiVersion: '0.1.0',

        /**
         * Holds all classes inherited through Li.extend.
         * @private
         */
        componentClasses: {},

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
                tpl = new Li.Template(text);
            }
            return tpl;
        },

        /**
         * Check if type is an observable.
         */
        isObservable: function (o) {
            return (Li.isFunction(o) && o.isLiObservable);
        },

        /**
         * Converts each property of object to an Observable
         */
        toObservable: function (obj) {
            Li.forEach(obj, function (val, key) {
                obj[key] = Li.Observable(val);
            });
            return obj;
        },

        /**
         * Get values from each property of ab object.
         * If property is an observable, then find it's primitive value.
         */
        fromObservable: function (obj) {
            if (!obj) {
                return obj;
            }
            var ret = {};
            Li.forEach(obj, function (val, key) {
                ret[key] = (Li.isObservable(val) ? val() : val);
            });
            return ret;
        },

        util: {
            /**
             * Parses string that could go into a tag's style attribute. Assumes valid CSS syntax.
             * Also assumes no duplicate CSS property.
             *
             * This handles semicolons, escaped characters and paranthesis that could be within a URI string.
             */
            parseStyleAttribute: function (str) {
                var css = {}, prop, val, pos, c, len, state = {};

                while (str) {
                    pos = str.indexOf(':');
                    prop = str.slice(0, pos).trim();
                    str = str.slice(pos + 1);

                    val = '';
                    len = str.length;
                    for (pos = 0; ; pos += 1) {
                        if (pos >= len) {
                            break;
                        }
                        c = str[pos];
                        //Handle URL bracket
                        if (c === '(' && !state.openBracket && !state.openQuote) {
                            state.openBracket = 1;
                        }
                        if (c === ')' && state.openBracket && !state.openQuote) {
                            delete state.openBracket;
                        }
                        //Handle quotes
                        if (c === "'" || c == '"') {
                            if (!state.openQuote) {
                                state[c] = 1;
                                state.openQuote = 1;
                            } else if (str[pos - 1] !== '\\') {
                                delete state[c];
                                delete state.openQuote;
                            }
                        }
                        //Stop on ;
                        if (c === ';' && !state.openQuote) {
                            break;
                        }
                        val += c;
                    }
                    val = val.trim();
                    css [prop] = val;
                    str = str.slice(pos + 1);
                }

                return css;
            }
        }
    });

    return Li;
});
