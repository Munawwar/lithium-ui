/**
 * Contains useful polyfills for older browsers (read IE 11).
 * @module core
 */

/*global jQuery, HTMLElement*/
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([''], factory);
    } else if (typeof exports === 'object') { //For NodeJS
        module.exports = factory();
    } else { //global
        factory();
    }
}(this, function () {
    /*Polyfill Object.assign*/
    if (!Object.assign) { // IE 11
        Object.assign = function (target) {
            Li.slice(arguments, 1).forEach(function (obj) {
                if (obj !== undefined && obj !== null) {
                    Object.keys(obj).forEach(function (key) {
                        target[key] = obj[key];
                    });
                }
            });
            return target;
        };
    }

    /*Polyfill String.prototype.includes*/
    if (!String.prototype.includes) { // IE 11
        String.prototype.includes = function (str) {
            return (this.indexOf(str) > -1);
        };
    }

    /*Polyfill String.prototype.startsWith and endsWith*/
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (str, position) {
            position = position || 0;
            return this.substr(position, str.length) === str;
        };
    }
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function (str, position) {
            if (typeof position !== 'number' || !isFinite(position) || position > this.length) {
                position = this.length;
            }
            return (this.slice(position - str.length, position) === str);
        };
    }
    /*Polyfill String.prototype.repeat*/
    if (!String.prototype.repeat) {
        String.prototype.repeat = function (count) {
            return (new Array(count + 1)).join(this);
        };
    }

    /*Polyfill Array.prototype.find and findIndex*/
    if (!Array.prototype.find) {
        Array.prototype.find = function (comparator, context) {
            for (var i = 0; i < this.length; i += 1) {
                var value = this[i];
                if (comparator.call(context, value, i, this)) {
                    return value;
                }
            }
        };
    }
    if (!Array.prototype.findIndex) {
        Array.prototype.findIndex = function (comparator, context) {
            for (var i = 0; i < this.length; i += 1) {
                var value = this[i];
                if (comparator.call(context, value, i, this)) {
                    return i;
                }
            }
            return -1;
        };
    }

    /* **** DOM Polyfills **** */
    if (this.Element) { // is node.js
        if (!Element.prototype.matches) {
            (function (proto) {
                var matches = proto.webkitMatchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector;
                if (matches) {
                    proto.matches = matches;
                }
            }(Element.prototype));
        }

        if (!Element.prototype.closest) {
            Element.prototype.closest = function (selector) {
                var el = this;
                while (el && !el.matches(selector)) {
                    el = el.parentNode;
                }
                return el || null;
            };
        }
    }

    return null;
}));
