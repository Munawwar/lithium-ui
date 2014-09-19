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
            var typeLowerCase = type.toLowerCase();
            this.componentClasses[typeLowerCase] = Li.extend(baseClass, protoObj);

            var proto = this.getClass(typeLowerCase).prototype,
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
            return this.getClass(typeLowerCase);
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
            return (Li.isObject(o) && o.isLuiObservable);
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

    Lui.util = {
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
         */
        childIndex: function (node) {
            return Li.slice(node.parentNode.childNodes).indexOf(node);
        }
    };

    return Lui;
});
