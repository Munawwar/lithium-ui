define(['./Cards'], function (Lui) {

/**
 * A container that swtiches between different inner components.
 * You can use Box to achieve layouts.
 */
Lui.extend('Lui.Tabs', Lui.Box, {
    /**
     * @protected
     */
    items: [{
        ref: 'bar',
        cls: 'nav nav-tabs',
        items: []
    }, {
        type: 'Cards',
        ref: 'cards',
        items: []
    }],

    /**
     * Active tab item.
     */
    activeItem: 0,

    /**
     * Tabs button config
     */
    buttons: [],

    /**
     * Items to passed to Lui.Cards instance
     */
    cards: [],

    init: function () {
        this.buttons.forEach(function (s, i) {
            if (Li.isString(s)) {
                this.buttons[i] = {
                    type: 'Button',
                    label: s
                };
            }
        }, this);
        this.items[0].items = this.buttons;
        this.items[1].activeItem = this.activeItem;
        this.items[1].items = this.cards;
        this.super(arguments);
    },

    postRender: function () {
        this.super(arguments);
        this.items[1].setActiveItem(this.activeItem);
    }
});

return Lui;
});
