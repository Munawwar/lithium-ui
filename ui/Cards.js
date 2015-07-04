define(['../core/Box'], function (Li) {

    /**
     * A container that swtiches between different inner components.
     * You can use Box to achieve layouts.
     */
    Li.Cards = Li.extend('Li.Cards', Li.Box, {
        /**
         * Active item
         */
        activeItem: 0,

        postRender: function () {
            this.super(arguments);
            this.setActiveItem(this.activeItem);
        },

        /**
         * Displays given card number and hides the other cards.
         */
        setActiveItem: function (itemNumber) {
            if (this.el) {
                var items = Li.slice(this.el.children);
                    len = items.length;
                if (len && itemNumber >= 0 && itemNumber < len) {
                    this.activeItem = itemNumber;
                    items.forEach(function(item, i) {
                        if (i !== itemNumber) {
                            item.style.display = 'none';
                        } else {
                            item.style.removeProperty('display');
                        }
                    }, this);
                }
            }
        }
    });

    return Li;
});
