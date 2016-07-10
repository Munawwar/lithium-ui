define([
    '../core/Box.js',
    './libs.js',

    './Cards.css!css'
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
         * @param {HTMLElement} el
         */
        addCard: function (el) {
            el.style.display = 'none';
            this.el.appendChild(el);
        },

        /**
         * Displays given card number and hides the other cards.
         */
        setActiveItem: function (item, animate) {
            var items = Li.slice(this.el.children),
                len = items.length,
                itemNumber = (Li.isNumber(item) ? item : Li.childIndex(item, true));
            if (itemNumber >= 0 && itemNumber < len) {
                //Complete any running animations.
                if (this.animating) {
                    this.animating.forEach(function (elOrFunc) {
                        if (typeof elOrFunc === 'function') {
                            elOrFunc();
                        } else {
                            $(elOrFunc).velocity('stop');
                        }
                    });
                }

                var prevItem = this.activeItem;
                this.activeItem = itemNumber;

                if (!animate) {
                    items[prevItem].style.display = 'none';
                    items[this.activeItem].style.removeProperty('display');
                } else if (this.activeItem !== prevItem) {
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

                    var c1 = function () {
                            items[prevItem].style.display = 'none';
                        },
                        c2 = function () {
                            //Remove added properties
                            this.el.classList.remove('animating');
                            Li.style(items[prevItem], {zIndex: null, opacity: null});
                            Li.style(items[itemNumber], {zIndex: null, opacity: null});
                            if (this.el.classList.contains('vbox')) {
                                flexRecalc(this.el);
                            }
                            this.animating = null;
                        }.bind(this);

                    this.animating = [
                        $(items[prevItem]).velocity({opacity: 0}, {
                            complete: c1
                        })[0],
                        c1,
                        $(items[this.activeItem]).velocity({opacity: 1}, {
                            queue: false,
                            complete: c2
                        })[0],
                        c2
                    ];
                }
            }
        },

        /**
         * Get the active item number. If returnName param is set to true, then returns the active item's data-name attribute value.
         */
        getActiveItem: function (returnDom) {
            return (!returnDom ? this.activeItem : this.el.children[this.activeItem]);
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
