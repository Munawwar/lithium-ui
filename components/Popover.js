/**
 * This class is the base class for all pop-over components (like Modals,
 * info popovers, drop-downs, color pickers).
 */
define([
    'jquery',
    '../core/Box.js',

    './Popover.ko!tpl'
], function ($, Li) {
    /**
     * Base class for Window.
     */
    Li.Popover = Li.extend('Li.Popover', Li.Box, {
        /**
         * Configure whether popover can be closed by user or not.
         */
        dismissible: true,

        constructor: function (cfg) {
            /**
             * @event clickclosed Fires when popover is closed due to clicking outside popover.
             */
            /**
             * @event escapeclosed Fires when popover is closed by pressing escape key.
             */
            /**
             * @event autoclosed Fires when popover is closed due to another popover being opened at same level or higher.
             */

            this.super(arguments);
        },

        /**
         * @param {Event} [event] DOM event. If passed event.stopPropagation() will be called.
         * If you don't pass this, then remember to call stopPropagation for click events.
         *
         * @param {Object} [position] An object that will be passed to Li.position() for placing the popover.
         * If not passed, then positioning won't be done.
         *
         * If position.relTo property isn't set, then relTo is assumed to be event.target.
         * position.target property doesn't need to be set, as target is this.el (obviously!).
         */
        show: function (e, position) {
            var $el = $(this.el),
                stack = Li.Popover.stack,
                level = 1;

            var sourceEl = (position && position.relTo) || (e && e.target);

            //First find the level of the popup.
            if (sourceEl) {
                var parent = Li.Popover.getParentPopoverInfo(sourceEl);
                level = parent ? parent.level + 1 : level;
            }

            //Close all popovers of same level or higher.
            Li.Popover.closePopovers(level, 'autoclosed', this);

            //Push to stack.
            stack.push({
                component: this,
                level: level
            });
            $el.css('z-index', 1000 + stack.length);

            if (stack.length === 1) { //add event listeners only once, rather than for each popover.
                // Return on click of document
                Li.on(document, 'click', this.onClickDocument);
                // Return on ESC
                Li.on(document, 'keyup', this.onKeyUpDocument);
            }

            if (e) {
                e.stopPropagation();
            }

            $el.css({display: "block"});

            if (!document.body.contains(this.el)) {
                this.attach(document.body);
            }

            if (position && sourceEl) {
                position.target = this.el;
                position.relTo = sourceEl;
                Li.position(position);
            }
        },

        hide: function (animateOpts) {
            var stack = Li.Popover.stack;

            //Remove self from stack.
            var index = -1;
            stack.forEach(function (info, i) {
                if (info.component === this) {
                    index = i;
                }
            }, this);
            if (index > -1) {
                stack.splice(index, 1);
            }

            if (!stack.length) {
                Li.off(document, 'click', this.onClickDocument);
                Li.off(document, 'keyup', this.onKeyUpDocument);
            }

            if (animateOpts) {
                $(this.el).velocity({ opacity: 0 }, Object.assign({ display: "none" }, Li.isObject(animateOpts) ? animateOpts : {}));
            } else {
                this.el.style.removeProperty('display');
            }
        },

        onClickDocument: function (e) {
            var stack = Li.Popover.stack;
            if (stack.length) {
                var last = stack[stack.length - 1];
                //Only consider clicks outside of the Popover.
                if (last.component.el.contains(e.target)) {
                    return;
                }
                Li.Popover.closePopovers(last.level, 'clickclosed');
            }
        },

        onKeyUpDocument: function (e) {
            if (e.keyCode === 27) { // ESC key
                var stack = Li.Popover.stack;
                if (stack.length) {
                    var last = stack[stack.length - 1];
                    //Only consider ESC outside of the Popover.
                    if (last.component.el.contains(e.target)) {
                        return;
                    }
                    Li.Popover.closePopovers(last.level, 'escapeclosed');
                }
            }
        },

        statics: {
            /**
             * Stackish data structure that keeps information about Popovers opened/shown.
             *
             * Each item has two properties - the component and the level at which the popover is.
             * Level is depth of popovers opened. Example: If one opens a popover inside another one,
             * then the second popover will have a level of 2 and the parent will have a level of 1.
             */
            stack: [],

            /**
             * Singleton cache
             */
            singletonCache: {},
            /**
             * Static method to manage singletons
             */
            singleton: function (cfg) {
                if (!cfg.type || cfg.type === 'Li.Popover' || cfg.type === 'Li.Modal') {
                    throw new Error('Window Type is needed. And it should be a derived class of Li.Popover or Li.Modal.');
                }
                var instance = Li.Popover.singletonCache[cfg.type];
                if (!instance) {
                    var Class = Li.getClass(cfg.type);
                    instance = new Class(cfg);
                    Li.Popover.singletonCache[cfg.type] = instance;
                } else {
                    instance.set(cfg);
                }

                return instance;
            },

            /**
             * Get the item in Li.Popover.stack that represents the parent popover of a given popover.
             */
            getParentPopoverInfo: function (sourceEl) {
                var parent = {};
                Li.Popover.stack.forEach(function (info) {
                    var popover = info.component,
                        zIndex = parseInt(popover.el.style.zIndex, 10);
                    if (popover.el.contains(sourceEl) && (!parent.info || parent.zIndex > zIndex)) { //the one with higher zIndex is the parent
                        parent.zIndex = zIndex;
                        parent.info = info;
                    }
                });
                if (parent.info) {
                    return parent.info;
                }
                return null;
            },

            /**
             * Closes all popovers of given level and higher.
             */
            closePopovers: function (level, eventName, caller) {
                var stack = Li.Popover.stack,
                    info;
                //Iterate backwards, since otherwise removal of item can affect iteration.
                for (var i = stack.length - 1; i >= 0; i -= 1) {
                    info = stack[i];
                    if (info.component !== caller && info.level >= level && info.component.dismissible) {
                        info.component.hide(); //this also removes item from stack
                        info.component.trigger(eventName);
                    }
                }
            }
        }
    });

    return Li;
});
