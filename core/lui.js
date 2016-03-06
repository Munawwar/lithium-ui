define([
    'jquery',
    './base/lithium',
    './base/lithium.events'
], function ($, Li) {

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
                tplTag = document.querySelector(selector);
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
        }
    });

    return Li;
});
