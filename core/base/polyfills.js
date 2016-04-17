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

    return null;
}));
