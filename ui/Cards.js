define(['../core/Box'], function (Lui) {

    /**
     * A container that swtiches between different inner components.
     * You can use Box to achieve layouts.
     */
    Lui.Cards = Lui.extend('Lui.Cards', Lui.Box, {
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
            if (this.rootEl) {
                var items = Li.slice(this.rootEl.children);
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

    return Lui;
});
