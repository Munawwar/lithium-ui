if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['jquery-node', '../lib/lithium/src/lithium', '../lib/lithium/src/lithium.extras'], function ($, Li) {

    var Lui = {
        version: '0.1.0',

        /**
         * Holds all classes inherited through Lui.extend.
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
         * Uses Li.extend() to create the class using baseClass and proto, and at the same time
         * register the class type with Lui so that it can be used in HTML views parsed by Lui.
         * This automatically also adds the 'type' as a string to prototype of class (which Lui.Component uses in rendered markup).
         * @param {String} type Unique name (including namespace) to be used for the new class. eg 'Lui.Box'.
         * @param {Function} baseClass
         * @param {Object} proto Prototype to use for creating the new class.
         */
        extend: function (type, baseClass, protoObj) {
            protoObj.type = type;
            var typeLowerCase = type.toLowerCase(),
                classRef = Li.extend(baseClass, protoObj);
            this.componentClasses[typeLowerCase] = classRef;

            var proto = classRef.prototype,
                P = function () {};
            P.prototype = proto;
            var inst = new P();

            //Find all observables from prototype and note them down in _observables.
            //A Component instance can use _observables to make it's own copy of these observables.
            proto._observables = [];
            for (var prop in inst) {
                if (Lui.isObservable(inst[prop])) {
                    proto._observables.push(prop);
                }
            }

            if (Li.isFunction(inst.afterExtend)) {
                inst.afterExtend(proto);
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
                tpl = new Lui.Template(text);
            }
            return tpl;
        },

        /**
         * Check if type is an observable.
         */
        isObservable: function (o) {
            return (Li.isFunction(o) && o.isLuiObservable);
        },

        /**
         * Converts each property of object to an Observable
         */
        toObservable: function (obj) {
            Li.forEach(obj, function (val, key) {
                obj[key] = Lui.Observable(val);
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
                ret[key] = (Lui.isObservable(val) ? val() : val);
            });
            return ret;
        }
    };

    return Lui;
});
