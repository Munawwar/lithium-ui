/**
 * Publisher-subscriber pattern utility class
 * @module pubsub
 * @requires core
 * @title Lithium Publisher-Subscriber
 */
(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(['./lithium', 'jquery'], factory);
    } else { //global
        factory(window.Li, jQuery);
    }
}(function (Li, $) {
    /**
     * Base class for Publishers.<br/>
     * This class helps you to achieve the Observer (also known as publisher-subscriber) design pattern.<br/>
     *
     * Your class prototype may have a property named 'eventTypes' which is a list (i.e array) of eventTypes
     * that the class as a publisher would/can trigger.
     *
     * @namespace Li
     * @class Publisher
     */
    Li.Publisher = Li.extend(Object, {
        /**
         * Call all events listeners for the given event name.<br/>
         * @param {String} eventType
         * @param {Any} ... n number of arguments. These shall be directly passed onto the event listeners.
         * @method trigger
         */
        trigger: function (eventType) {
            eventType = eventType.toLowerCase();
            this._eventMap_ = this._eventMap_ || {};
            if ((!this._eventTypes_ || !this._eventTypes_[eventType]) && Li.warnings) {
                console.warn(eventType + "? This event type has not been registered.");
            }
            if (!this._suspendEvents_ && this._eventMap_[eventType]) {
                var i, len,
                    events = this._eventMap_[eventType];
                for (i = 0, len = events.length; i < len; i += 1) {
                    events[i].fn.apply(events[i].scope, Li.slice(arguments, 1));
                }
            }
        },

        /**
         * Adds a listener.
         * If no parameters are specified, then this would re-enable events that were switched off by publisher.unsubscribe();
         * @param {String|Object} object The event type that you want to listen to as string.
         * Or an object with event types and handlers as key-value pairs (with event type as the keys).
         * You can also subscribe for an event that has not yet been registered as an event. Hence the order of registeration is not a concern.
         * @param {Function} handler Function that gets notfied when a event of 'eventType' gets fired. This param is used only when eventType is a string.
         * @param {Object} scope The context in which the function should be called.
         * @method subscribe
         * @return A UUID which can be used to remove the event when required.
         */
        //TODO: Add option to bind arguments
        subscribe: (function () {
            var uuidGen = 1;
            //TODO: Also set config like onetime = true etc
            return function (eventType, handler, scope) {
                if (!Li.isDefined(eventType)) {
                    this._suspendEvents_ = false;
                } else if (Li.isObject(eventType)) {
                    var ret = {};
                    Li.forEach(eventType, function (handler, type) {
                        ret[type] = this.subscribe(type, handler, scope);
                    }, this);
                    return ret;
                } else {
                    this._eventMap_ = this._eventMap_ || {};
                    var events = this._eventMap_,
                        id = 'ls' + (uuidGen++);
                    events[eventType] = events[eventType] || [];
                    events[eventType].push({
                        uuid: id,
                        fn: handler,
                        scope: scope
                    });
                    return id;
                }
            };
        }()),

        /**
         * This function listens to a given publisher on the given event types,
         * and refires the events from itself (scope of the event fired would be this object).
         * This useful for chaining events.
         * @param {Li.Publisher} publisher A publisher instance.
         * @param {Array|null} eventTypes Event types to listen on. If eventType is null, it listens to all events of the publisher.
         * @method relayEvents
         */
        relayEvents: (function () {
            var relayThis = function (eventType) {
                var args = Li.slice(arguments, 1);
                this.trigger.apply(this, ([eventType]).join(args));
            };
            return function (publisher, eventTypes) {
                if (!publisher._eventTypes_) {
                    throw new Error('Object passed is not a publisher');
                }
                eventTypes = eventTypes || Object.keys(publisher._eventTypes_);
                var i, len = eventTypes.length, eventType;
                for (i = 0; i < len; i += 1) {
                    eventType = eventTypes[i];
                    publisher.subscribe(eventType, Li.bind(relayThis, null, false, eventType), this);
                }
            };
        }()),

        /**
         * Remove an event listener.
         * If no parameters are specified, then all events are switched off till you call publisher.subscribe().
         * @param {String|Function} uuidORfunc Can be the event listener as a Function object,
         * OR the UUID returned by 'subscribe' function can also be used.
         * @return {Boolean} Returns true if listener was successfully removed.
         * @method unsubscribe
         */
        unsubscribe: function (eventType, uuidORfunc) {
            if (!Li.isDefined(eventType)) {
                this._suspendEvents_ = true;
                return;
            }
            eventType = eventType.toLowerCase();
            var found = false;
            if (this._eventMap_) {
                var events = this._eventMap_[eventType], i, len,
                    type = Li.isString(uuidORfunc) ? "uuid" : "fn",
                    value = uuidORfunc;
                if (events) {
                    for (i = 0, len = events.length; i < len; i++) {
                        if (events[i][type] === value) {
                            events.splice(i, 1);
                            found = true;
                            break;
                        }
                    }
                }
            }
            return found;
        }
    });

    /**
     * Given a class, it inherits event types from base class.
     * @private
     */
    Li.inheritEvents = function (func) {
        //No need to do anything if class hasn't added any new event types.
        var proto = func.prototype;
        if (proto.eventTypes) {
            var eventTypes = proto.eventTypes || [],
                types = proto._eventTypes_; //This should recursively go up prototype
                                                  //chain and find the first _eventTypes_
            proto._eventTypes_ = $.extend({}, types);
            eventTypes.forEach(function (eventType) {
                proto._eventTypes_[eventType.toLowerCase()] = true;
            });
        }
    };

    return Li;
}));
