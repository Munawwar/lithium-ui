define(['../core/Box'], function (Lui) {

/**
 * A container that swtiches between different inner components.
 * You can use Box to achieve layouts.
 */
Lui.extend('Lui.Cards', Lui.Box, {
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
        var len = this.items.length;
        if (len && itemNumber >= 0 && itemNumber < len) {
            this.activeItem = itemNumber;
            this.items.forEach(function(item, i) {
                if (i !== itemNumber) {
                    item.rootEl.style.display = 'none';
                } else {
                    item.rootEl.style.removeProperty('display');
                }
            }, this);
        }
    }
});

return Lui;
});
