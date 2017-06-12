/**
 * Publisher-subscriber pattern utility class.
 *
 * @module pubsub
 * @requires core
 * @title Lithium Publisher-Subscriber
 */

var Li = require('./lithium.js');

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
     * @param {String} eventType Should be in lowercase.
     * @param {Object} config This will be passed onto the event listeners.
     * @method trigger
     */
    trigger: function (eventType, config) {
        eventType = eventType.toLowerCase();

        this._eventMap_ = this._eventMap_ || {};
        if (this._eventMap_[eventType]) {
            var subscribers = this._eventMap_[eventType];
            // Slice subscriber list to handle unsubscription inside of a subscriber.
            subscribers.list.slice().forEach(function (subscriber) {
                // First check if this subscriber was removed inside of a previously called subscriber.
                if (!subscribers.map[getSubscriberHash(subscriber)]) {
                    return;
                }
                subscriber.fn.call(subscriber.scope, new Li.PublisherEvent({type: eventType, publisher: this}), config);
            }, this);
        }
    },

    /**
     * Adds a listener.
     * @param {String|Object} object The event type that you want to listen to as string.
     * Or an object with event types and handlers as key-value pairs (with event type as the keys).
     * You can also subscribe for an event that has not yet been registered as an event. Hence the order of registeration is not a concern.
     * @param {Function} handler Function that gets notfied when a event of 'eventType' gets fired. This param is used only when eventType is a string.
     * @param {Object} scope The context in which the function should be called.
     * @method subscribe
     */
    subscribe: function (eventType, handler, scope) {
        if (!Li.isDefined(eventType)) {
            return;
        }
        if (Li.isObject(eventType)) {
            Li.forEach(eventType, function (handler, type) {
                this.subscribe(type, handler, scope);
            }, this);
        } else {
            this._eventMap_ = this._eventMap_ || {};
            this._eventMap_[eventType] = this._eventMap_[eventType] || { list: [], map: {} };
            var subscribers = this._eventMap_[eventType],
                subscriber = {
                    fn: handler,
                    scope: scope || undefined //handle null
                },
                hash = getSubscriberHash(subscriber);

            // Do not subscribe if same function-scope combination was previously used to subscribe.
            if (!subscribers.map[hash]) {
                subscribers.list.push(subscriber);
                subscribers.map[hash] = true;
            }
        }
    },

    /**
     * This function listens to a given publisher on the given event types, and refires the events from itself.
     * This useful for chaining events.
     * @param {Li.Publisher} publisher A publisher instance.
     * @param {Array|null} eventTypes Event types to listen on. If eventType is null, it listens to all events of the publisher.
     * @method relayEvents
     */
    relayEvents: function (publisher, eventTypes) {
        if (!(publisher instanceof Li.Publisher)) {
            throw new Error('Object passed is not a publisher');
        }
        var relay = function relayFunction(e, cfg) {
            this.trigger(e.type, cfg);
        }.bind(this);
        eventTypes.forEach(function (eventType) {
            publisher.subscribe(eventType, relay);
        }, this);
    },

    /**
     * Remove an event listener or all event listener for an event type.
     * If no parameters are specified, then all events are switched off till you call publisher.subscribe().
     * @param {String} eventType Event type
     * @param {Function} handler Send in the same function that was used with the subscribe() method.
     * @param {Object} [scope] Send in the same context object that was used with the subscribe() method.
     * @return {Boolean} Returns true if listener was successfully removed.
     * @method unsubscribe
     */
    unsubscribe: function (eventType, handler, scope) {
        if (!Li.isDefined(eventType)) {
            return;
        }
        eventType = eventType.toLowerCase();
        scope = scope || undefined; //handle null
        var found = false;
        if (this._eventMap_) {
            var subscribers = this._eventMap_[eventType];
            if (subscribers) {
                // If caller intentionally only supplied single argument,
                // then unsubscrube all listeners for event type.
                if (arguments.length === 1) {
                    found = (subscribers.list > 0);
                    this._eventMap_[eventType] = { list: [], map: {} };
                // else unsubscribe only for the given function and scope.
                } else {
                    found = subscribers.list.some(function (subscriber, i) {
                        if (subscriber.fn === handler && (!scope ||
                            subscriber.scope === scope)) {
                            subscribers.list.splice(i, 1);
                            delete subscribers.map[getSubscriberHash(subscriber)];
                            return true;
                        }
                    });
                }
            }
        }
        return found;
    }
});

function getSubscriberHash(subscriber) {
    if (subscriber.scope) {
        return Li.getUID(subscriber.fn) + '#' + Li.getUID(subscriber.scope);
    }
    return Li.getUID(subscriber.fn);
}

/**
 * An almost "plain" object class. Used for differentiating publisher events.
 */
Li.PublisherEvent = function PublisherEvent(cfg) {
    Object.assign(this, cfg);
};

module.exports = Li;