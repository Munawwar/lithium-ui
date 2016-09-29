/**
 * Lithium - Utilities that jQuery doesn't have.
 * Intended to be used along with jQuery.
 * MIT License
 */

/**
 * Contains core utility functions and classes.
 * @module core
 */

/*global jQuery, HTMLElement*/
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(['jquery', './polyfills.js'], factory);
    } else if (typeof exports === 'object') { //For NodeJS
        module.exports = factory(require('jquery'));
    } else { //global
        root.Li = factory(jQuery);
    }
}(this, function ($) {
    /**
     * Contains useful and most frequently used functions.
     * @class Li
     * @static
     */

    var Li = {
        /**
         * Checks whether a variable is defined.
         * @param {Any} val
         * @method isDefined
         */
        isDefined: function (val) {
            return typeof val !== 'undefined'; //Remove this when dropping IE8 support
        },

        /**
         * Returns true for all values that are of type 'boolean'<br/>
         * Note that booleans declared with 'new' keyword are objects and aren't considered "boolean"s.
         * @param {Any} val
         * @method isBoolean
         */
        isBoolean: function (val) {
            return (typeof val === 'boolean');
        },

        /**
         * Any value that is an object (excluding null).<br/>
         * Note that arrays and all instances created with 'new' keyword are objects.
         * Functions aren't considered as objects (even though they technically are like objects, excluding them makes the check narrower).
         * @param {Any} val
         * @method isObject
         */
        isObject: function (val) {
            return val !== null && typeof val === 'object';
        },

        /**
         * Checks whether a given value is a string.<br/>
         * Note that strings declared with 'new' keyword are objects and aren't considered "string"s.
         * @param {Any} val
         * @method isString
         */
        isString: function (val) {
            return (typeof val === 'string');
        },

        /**
         * Returns true for any number (including Infinity).
         * Note that numbers declared with 'new' keyword are objects and aren't considered "number"s.
         * @param {Any} val
         * @method isNumber
         */
        isNumber: function (val) {
            return (typeof val === 'number' && !isNaN(val));
        },

        /**
         * Returns true for any finite number.
         * Note that numbers declared with 'new' keyword are objects and aren't considered "number"s.
         * @param {Any} val
         * @method isFinite
         */
        isFinite: function (val) {
            return (typeof val === 'number' && isFinite(val));
        },

        /*For completeness*/
        /**
         * Same as Array.isArray
         * @method isArray
         */
        isArray: Array.isArray,

        /**
         * Same as jQuery.isFunction
         * @method isFunction
         */
        isFunction: function (f) {
            return typeof f === 'function' || f instanceof Function;
        },

        /**
         * Checks whether a given value is a DOM Element (Text nodes aren't included, nodeType should = 1)
         * @param {Object} obj
         * @method isElement
         */
        isElement: function (obj) {
            return (obj instanceof HTMLElement);
        },

        /**
         * Returns true only when value is NaN.
         * @param {Any} val
         * @method isNaN
         */
        isNaN: function (val) {
             //isNaN(undefined) is true
             //isNaN({}) is true
             //isNaN('3') is false
             //isNaN('t') is true
            return (typeof val === 'number' && isNaN(val));
        },

        /**
         * Returns a new function with bounded context and arguments.
         * The parameters sent to this new function, followed by the given arguments to rbind(), will be forwarded to the original function.<br/>
         * This is similar to JS 1.8.5 bind, but the bounded parameters are appended (and not prepended) to the original function.
         * @param {Function} func Function to call
         * @param {Object} context Set the value of the 'this' keyword to be within the function.
         * @param {Any} [...] Optional. Any number of arguments, which will be forwarded to func on call.
         * @return {Function} A new function which will have binded context and arguments.<br/>
         * @method rbind
         */
        rbind: function (func, context) {
            var args = Li.slice(arguments, 2);
            return function () {
                return func.apply(context || this, Li.slice(arguments).concat(args));
            };
        },

        /**
         * Same as Object.assign(). Check MDN for documentation for Object.assign().
         * @method mix
         */
        mix: Object.assign,

        /**
         * Classical inheritence, where only prototype is inherited.
         * @param {Function} baseC The constructor to be inherited from (the parent)
         * @param {Object} derived The object which has a constructor and methods/properties. This will be the derived class.
         * @param {Function} derived.constructor Should be a function constructor of derived class.
         * @param {Object} derived.statics An object whose properties will be added to the derived constructor as static properties/methods.
         * @return {Function} Returns the derived constructor (the same derived.constructor).
         * @method extend
         */
        extend: (function () {
            function superFunc(args) {
                var fn = superFunc.caller;
                return fn._baseclass_[fn._methodName_].apply(this, args);
            }
            function superClassFunc() {
                var fn = superClassFunc.caller;
                return fn._baseclass_;
            }
            return function (baseC, derived) {
                derived = derived || {};
                //constructor property always exists, hence the hasOwnProperty check.
                var derivedC = derived.hasOwnProperty('constructor') ? derived.constructor : function () {
                        baseC.apply(this, arguments);
                    }, //'C' suffix is for 'Constructor'
                    statics = derived.statics;

                derivedC.prototype = Object.create(baseC.prototype);
                derivedC.super = baseC.prototype;
                derivedC.prototype.super = superFunc;
                derivedC.prototype.superclass = superClassFunc;

                Li.forEach(derived, function (val, prop) {
                    if (Li.isFunction(val)) {
                        val._methodName_ = prop;
                        val._baseclass_ = baseC.prototype;
                    }
                    derivedC.prototype[prop] = val;
                });

                //Add static properties to constructor
                if (statics) {
                    delete derived.statics;
                    Li.mix(derivedC, statics);
                }

                if (Li.Observable && derivedC.prototype instanceof Li.Observable) {
                    Li.inheritEvents(derivedC);
                }

                return derivedC;
            };
        }()),

        /**
         * Iterate through an array or object.<br/>
         * Iterates through an object's properties and calls the given callback for each (enumerable) property.
         *
         * Note: For arrays, this method calls Array.forEach.
         * @param {Object} obj The array/object to iterate through.
         * @param {Function} callback Callback function. Value, index/key and a reference to the array/object are sent as parameters (in order) to the callback.
         * @param {Object} [context] Optional The value of the 'this' keyword within the callback.
         * @return {object} obj
         * @method forEach
         */
        forEach: function (obj, callback, context) {
            if (Li.isArray(obj)) {
                obj.forEach(callback, context);
            } else {
                for (var x in obj) {
                    if (obj.hasOwnProperty(x)) {
                        callback.call(context, obj[x], x, obj);
                    }
                }
            }
            return obj;
        },

        /**
         * Get all values from an object (that contains key:value pairs).
         * @param {Object} obj The object to iterate through.
         * @method values
         */
        values: function (object) {
            var values = [];
            Li.forEach(object, function (item) {
                values.push(item);
            });
            return values;
        },

        /**
         * Adds properties (and methods) to a function's prototype.
         * Note: You won't be warned if you overwrite an existing method/property.
         * @method augment
         */
        augment: function (classRef, properties) {
            Li.forEach(properties, function (val, prop) {
                if (Li.isFunction(val)) {
                    val._methodName_ = prop;
                    val._baseclass_ = classRef.super;
                }
                classRef.prototype[prop] = val;
            });

            //Add static properties to constructor
            var statics = properties.statics;
            if (statics) {
                delete properties.statics;
                Li.mix(classRef, statics);
            }
        },

        /**
         * String formatting
         * @param {String} str String with placeholders
         * @param {Object|...} arg If object then you can use {propertyName} as placeholder.
         * Else you can supply n number of args and use {argument index} as placholder
         * @method format
         * @example
         *
         *     Li.format('<div class="{0}">', 'box');
         *     Li.format('<div class="{cls}">', {cls: 'box'});
         *     //output of both: <div class="box">
         *
         */
        format: function (str, arg) {
            if (!Li.isObject(arg)) {
                arg = Li.slice(arguments, 1);
            }
            return str.replace(/(^|[^\\])\{(\w+)\}/g, function (m, p, index) {
                var x = arg[index];
                return (p || '') + (x !== undefined ? x : '');
            });
        },

        /**
         * Same as Array.slice except that it can work on array-like data types (i.e arguments, element.childNodes, NodeList...)
         * @param {Array-like} array Array like values.
         * @method slice
         * @example var elements = Li.slice(document.body.childNodes, 3); //get first 3 nodes.
         */
        slice: function (array, from, end) {
            var len = array.length;
            from = from || 0;
            end = end || len;
            return Array.prototype.slice.call(array, from, end);
        },

        /**
         * Converts an array of string (or string-convertible) items into a object map with
         * each of it's key as an array item and it's corresponding value as the item's index, and returns the map.
         * @param {Boolean} [fill] If set, all map values will be set to the given value. If left undefined
         * then item's index is used.
         */
        toMap: function (arr, fill) {
            var map = {};
            arr.forEach(function (str, i) {
                map[str] = (fill !== undefined ? fill : i);
            });
            return map;
        },

        /**
         * Generates an unique alpha-numeric identifier.<br/>
         * To get the same permutation as RFC-4122 use len=24.
         * @param [len=10] Length of the UUID.
         * @param [hypenate=false] When set to true, hyphens are added to the UUID.
         * @return {String} The UUID
         * @method uuid
         */
        uuid: function (len, hypenate) {
            var count = 1, id = ('x').repeat(len || 10).replace(/x/g, function () {
                return ((count++ % 5) ? '' : '-') + (Math.random() * 100 % 36 | 0).toString(36);
            });
            return hypenate ? id : id.replace(/-/g, '');
        },

        /**
         * Send in any object (including function, DOM Nodes or whatever) and get a unique id.
         * If you send the object again, the same id will be returned as the last time.
         * This does not leak memory.
         * @method getUID
         */
        getUID: function getUID(obj) {
            if (!obj._uid_) {
                Object.defineProperty(obj, '_uid_', {
                    value: Li.uuid(),
                    enumerable: false
                });
            }
            return obj._uid_;
        },


        /*Dom helpers*/
        /**
         * Converts html string to a document fragment.<br/>
         * The html string and arguments are first sent to Li.format to get the
         * final html string.
         * @param {String} html
         * @param {...} Any number of arguments that will be passed on to Li.format. Check Li.format documentation for more information.
         * @return {DocumentFragment}
         * @method dom
         */
        dom: function (html) {
            var frag = document.createDocumentFragment();
            $.parseHTML(Li.format.apply(this, arguments)).forEach(function (node) {
                frag.appendChild(node);
            });
            return frag;
        },

        /**
         * Add/remove styles from style attribute of an element.
         * @param {HTMLElement} el The HTML element to which styles should get added/removed.
         * @param {Object} styles Each key and value pair should represent a CSS property and value repsectively. Value can be a non-empty string, a number or null.
         * If value is null the CSS style property is removed from the element.
         * @method style
         */
        style: (function () {
            function toCssProp(m) {
                return '-' + m.toLowerCase();
            }
            return function (el, styles) {
                Li.forEach(styles, function (value, prop) {
                    if ((value && Li.isString(value)) || Li.isNumber(value)) {
                        el.style.setProperty(prop.replace(/[A-Z]/g, toCssProp), value);
                    } else if (value === null) {
                        el.style.removeProperty(prop.replace(/[A-Z]/g, toCssProp));
                    }
                });
            };
        }()),

        /**
         * Check whether an element is rendered by browser to be able to use function like offsetWidth.
         * @param {HTMLElement} el
         * @method isDisplayed
         */
        isDisplayed: function (el) {
            /* offsetParent would be null if display 'none' is set.
               However Chrome, IE and MS Edge returns offsetParent as null for elements
               with position 'fixed' CSS. so check whether the dimensions are zero.

               This check would be inaccurate if position is 'fixed' AND dimensions were
               intentionally set to zero. But..it is good enough for most cases.*/
            if (!el || (!el.offsetParent && !el.offsetWidth && !el.offsetHeight)) {
                return false;
            }
            return true;
        },

        /**
         * jQuery's index() method doesn't return the child index properly for non-element nodes (like text node, comment).
         * @param {Boolean} elementsOnly Ignore non-element children (like text nodes, comments).
         * @method childIndex
         */
        childIndex: function (node, elementsOnly) {
            return Li.slice(node.parentNode[elementsOnly ? 'children' : 'childNodes']).indexOf(node);
        },

        /**
         * Removes a Node from it's parent.
         * @method remove
         */
        remove: function (node) {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        }
    };

    (function () {
        var bindMemory = {},
            getUID = Li.getUID;
        /**
         * Add event listener to an element with a context.
         * @param {HTMLElement} element element to use
         * @param {String} type Type of event to listen to (like click, mouseover)
         * @param {Function} func Event handler
         * @param {Object} [context] Set the value of the 'this' keyword to be within the function.
         * @return {Boolean|undefined} Returns true if event handler is successfully managed by Li.on().
         * Returns false if same context and parameters were used before (indicating that one can't add two listeners with exact same parameters).
         * Returns undefined if context parameter isn't used.
         * @method on
         */
        Li.on = function (element, type, func, context) {
            var $el = $(element);
            if (arguments[3] === undefined) {
                $el.on(type, func);
            } else {
                var key = getUID(element) + '#' + type + '#' + getUID(func) + '#' + getUID(context);
                if (!bindMemory[key]) { //can't add two listeners with exact same arguments
                    var newFunc = func.bind(context);
                    bindMemory[key] = newFunc;
                    $el.on(type, newFunc);
                    return true;
                }
                return false;
            }
        };
        /**
         * Removes event listener from an element which was added through on() method.
         * NOTE: To remove event listener you need to pass the exact same parameters as you passed to on() method (including context).
         * @param {HTMLElement} element element to use
         * @param {String} type Type of event to listen to (like click, mouseover)
         * @param {Function} func Event handler
         * @param {Object} [context] Set the value of the 'this' keyword to be within the function.
         * @return {Boolean|undefined} Returns true if an event handler with context added with on() was removed successfully, else false.
         * Returns undefined if no context was passed.
         * @method off
         */
        Li.off = function (element, type, func, context) {
            var $el = $(element);
            if (arguments[3] === undefined) {
                $el.off(type, func);
            } else {
                var key = getUID(element) + '#' + type + '#' + getUID(func) + '#' + getUID(context),
                    newFunc = bindMemory[key];
                if (newFunc) {
                    delete bindMemory[key];
                    $el.off(type, newFunc);
                    return true;
                }
                return false;
            }
        };
    }());

    return Li;
}));
