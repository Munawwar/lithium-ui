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
        define(['jquery'], factory);
    } else if (typeof exports === 'object') { //For NodeJS
        module.exports = factory(require('jquery-node'));
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
            try {
                return (obj instanceof HTMLElement);
            } catch (e) { //IE8
                return (typeof obj === 'object' && obj.nodeType === 1);
            }
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
         * The arguments sent to this new function, followed by the optional arguments which were sent to 'bind', will be forwarded to func.<br/>
         * Similar to JS 1.8.5 bind, but with append as extra parameter.
         * @param {Function} func Function to call
         * @param {Object} context Set the value of the 'this' keyword to be within the function.
         * @param {Boolean} [append=false] If true, appends binded arguments to any call to the new (returned) function. If false, prepend arguments.
         * @param {Any} [...] Optional. Any number of arguments, which will be forwarded to func on call.
         * @return {Function} A new function which will have binded context and arguments.<br/>
         * @method bind
         */
        bind: function (func, context, append) {
            var outerArgs = Li.slice(arguments, 3);
            append = Li.isDefined(append) ? append : false;
            return function () {
                var args = Li.slice(arguments);
                args = append ? args.concat(outerArgs) : outerArgs.concat(args);
                return func.apply(context || this, args);
            };
        },

        /**
         * 'Left' bind<br/>
         * Same as bind, except that arguments are always prepended.
         * @param {Function} func Function to bind
         * @param {Object|null} [context] The context in which func is to be called. null would default to the global object.
         * @param {Any} [...] Any number of arguments to be binded to func.
         * @method lbind
         */
        lbind: function (func, context) {
            return Li.bind.apply(null, ([func, context, false]).concat(Li.slice(arguments, 2)));
        },

        /**
         * 'Right' bind<br/>
         * Same as bind, except that arguments are always appended.
         * @param {Function} func Function to bind
         * @param {Object|null} [context] The context in which func is to be called. null would default to the global object.
         * @param {Any} [...] Any number of arguments to be binded to func.
         * @method rbind
         */
        rbind: function (func, context) {
            return Li.bind.apply(null, ([func, context, true]).concat(Li.slice(arguments, 2)));
        },

        /**
         * Copies properties of given object(s) into a target object. Only does a shallow copy.
         * @param {Object} target Target object into which properties of source object is copies to.
         * @param {Object} source One or more objects from which the properties are taken from.
         * @param {Arguments} [...]
         * @method mix
         */
        mix: function (target) {
            Li.slice(arguments, 1).forEach(function (obj) {
                Object.keys(obj).forEach(function (key) {
                    target[key] = obj[key];
                });
            });
            return target;
        },

        /**
         * Classical inheritence, where only prototype is inherited.
         * @param {Function} baseC The constructor to be inherited from (the parent)
         * @param {Object} derived The object which has a constructor and methods/properties. This will be the derived class.
         * @param {Function} derived.constructor Should be a function constructor of derived class.
         * @param {Object} derived.statics An object whose properties will be added to the derived constructor as static properties/methods.
         * @return {Function} Returns the derived constructor (the same derived.constructor).
         * @method extend
         */
        //TODO: Use Object.create after dropping support for IE8.
        extend: (function () {
            function superFunc(args) {
                var fn = superFunc.caller;
                return fn._baseclass_[fn._methodName_].apply(this, args);
            }
            function superClassFunc() {
                var fn = superClassFunc.caller;
                return fn._baseclass_;
            }
            var P = function () {}; //proxy
            return function (baseC, derived) {
                derived = derived || {};
                //constructor property always exists, hence the hasOwnProperty check.
                var derivedC = derived.hasOwnProperty('constructor') ? derived.constructor : function () {
                        baseC.apply(this, arguments);
                    }, //'C' suffix is for 'Constructor'
                    statics = derived.statics;

                P.prototype = baseC.prototype;
                derivedC.prototype = new P();
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
         * Note: For arrays, this method calls Array.forEach, so for IE8 you must include lithium.ie.lang module.
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
         * @param {String} path
         * @method namespace
         * @example Li.namespace('mynamespace.ui.widgets');
         */
        namespace: function (path) {
            var part = (function () {return this; }()), temp;
            path = path.split('.');
            while ((temp = path.shift())) {
                part[temp] = part[temp] || {};
                part = part[temp];
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
         * Same as Array.slice except that it can work on array-like data types (i.e arguments, element.childNodes, NodeList...)
         * @param {Array-like} array Array like values.
         * @method slice
         * @example var elements = Li.slice(document.body.childNodes, 3); //get first 3 nodes.
         */
        slice: function (array, from, end) {
            var len = array.length, i, arr;
            from = from || 0;
            end = end || len;
            try {
                return Array.prototype.slice.call(array, from, end);
            } catch (e) {
                //Array.slice doesn't work on NodeList on IE8.
                if (from < 0) {
                    from += len;
                }
                if (end < 0) {
                    end += len;
                }
                for (i = from, len = array.length, arr = []; i < end && i < len; i += 1) {
                    arr.push(array[i]);
                }
                return arr;
            }
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
            var count = 1, id = (new Array((len || 10) + 1).join('x')).replace(/x/g, function () {
                return ((count++ % 5) ? '' : '-') + (Math.random() * 100 % 36 | 0).toString(36);
            });
            return hypenate ? id : id.replace(/-/g, '');
        },


        /*Dom helpers*/
        /**
         * Given a DOM node, this method finds the next tag/node that would appear in the dom.
         * WARNING: Do not remove or add nodes while traversing, because it could cause the traversal logic to go crazy.
         * @param node Could be a any node (element node or text node)
         * @param ancestor Node An ancestorial element that can be used to limit the search.
         * The search algorithm, while traversing the ancestorial heirarcy, will not go past/above this element.
         * @param {function} callback A callback called on each element traversed.
         *
         * callback gets following parameters:
         * node: Current node being traversed.
         * isOpenTag: boolean. On true, node would be the next open tag/node that one would find when going
         * linearly downwards through the DOM. Filtering with isOpenTag=true, one would get exactly what native TreeWalker does.
         * Similarly isOpenTag=false when a close tag is encountered when traversing the DOM. AFAIK TreeWalker doesn't give this info.
         *
         * callback can return one of the following values (with their meanings):
         * 'halt': Stops immediately and returns null.
         * 'return': Halts and returns node.
         * 'continue': Skips further traversal of current node (i.e won't traverse it's child nodes).
         * 'break': Skips all sibling elements of current node and goes to it's parent node.
         *
         * relation: The relation compared to the previously traversed node.
         * @param {Object} [scope] Value of 'this' keyword within callback
         * @method traverse
         */
        traverse: function (node, ancestor, callback, scope) {
            //if node = ancestor, we still can traverse it's child nodes
            if (!node) {
                return null;
            }
            var isOpenTag = true, ret = null;
            do {
                if (ret === 'halt') {
                    return null;
                }
                if (isOpenTag && node.firstChild && !ret) {
                    node = node.firstChild;
                    //isOpenTag = true;
                    ret = callback.call(scope, node, true, 'firstChild');
                } else if (node.nextSibling && node !== ancestor && ret !== 'break') {
                    if (isOpenTag) {
                        callback.call(scope, node, false, 'current');
                    }
                    node = node.nextSibling;
                    isOpenTag = true;
                    ret = callback.call(scope, node, true, 'nextSibling');
                } else if (node.parentNode && node !== ancestor) {
                    if (isOpenTag) {
                        callback.call(scope, node, false, 'current');
                    }
                    //Traverse up the dom till you find an element with nextSibling
                    node = node.parentNode;
                    isOpenTag = false;
                    ret = callback.call(scope, node, false, 'parentNode');
                } else {
                    node = null;
                }
            } while (node && ret !== 'return');
            return node || null;
        },

        /**
         * jQuery's index() method doesn't return the child index properly for non-element nodes (like text node, comment).
         * @method childIndex
         */
        childIndex: function (node) {
            return Li.slice(node.parentNode.childNodes).indexOf(node);
        },

        /**
         * Removes a Node from it's parent.
         * @method remove
         */
        remove: function (node) {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        },

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
                    if (c === "'" || c === '"') {
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
    };

    return Li;
}));
