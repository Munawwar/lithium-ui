define([
    '../core/Box',
    './libs',

    'css!./Cards.css'
], function (Li, $) {

    /**
     * A container that swtiches between different inner components.
     * You can use Box to achieve layouts.
     */
    Li.Cards = Li.extend('Li.Cards', Li.Box, {
        /**
         * Active item
         */
        activeItem: 0,

        /**
         * @param {HTMLElemen} el
         */
        addCard: function (el) {
            el.style.display = 'none';
            this.el.appendChild(el);
        },

        /**
         * Displays given card number and hides the other cards.
         */
        setActiveItem: function (itemNumber, animate) {
            var items = Li.slice(this.el.children),
                len = items.length;
            if (itemNumber >= 0 && itemNumber < len) {
                var prevItem = this.activeItem;
                this.activeItem = itemNumber;

                if (!animate) {
                    items[prevItem].style.display = 'none';
                    items[this.activeItem].style.removeProperty('display');
                } else {
                    this.el.classList.add('animating');
                    $(items[prevItem]).css({
                        zIndex: 2,
                        opacity: 1
                    });
                    Li.style(items[this.activeItem], {
                        zIndex: 1,
                        opacity: 0,
                        display: null //remove inline display value
                    });
                    $(items[prevItem]).velocity({opacity: 0}, {display: 'none', queue: false});
                    $(items[this.activeItem]).velocity({opacity: 1}, {
                        queue: false,
                        complete: function () {
                            //Remove added properties
                            this.el.classList.remove('animating');
                            Li.style(items[prevItem], {zIndex: null, opacity: null});
                            Li.style(items[this.activeItem], {zIndex: null, opacity: null});
                        }.bind(this)
                    });
                }
            }
        },

        render: function () {
            this.super(arguments);

            //Hide all
            Li.slice(this.el.children).forEach(function (el) {
                el.style.display = 'none';
            });
            //Unhide active one
            this.setActiveItem(this.activeItem);
        }
    });

    return Li;
});
