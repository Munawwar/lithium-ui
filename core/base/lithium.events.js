/**
 * Event handling.
 *
 * Motivation: function.bind(this) cannot be easily used to add and remove event listeners without keeping
 * references to the new function created. We need an abstraction since we use this internally within the library
 * a lot and sometimes directly as well.
 *
 * @module events
 * @requires core
 * @title Lithium Publisher-Subscriber
 */
(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(['./lithium', 'jquery'], factory);
    } else if (typeof exports === 'object') { //For NodeJS
        module.exports = factory(require('./lithium'), require('jquery-node'));
    } else { //global
        factory(window.Li, jQuery);
    }
}(function (Li, $) {
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

    return Li;
}));
