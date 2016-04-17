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
        root.Li = factory();
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

    return null;
}));
