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
        setActiveItem: function (itemNumber) {
            var items = Li.slice(this.el.children),
                len = items.length;
            if (itemNumber >= 0 && itemNumber < len) {
                items[this.activeItem].style.display = 'none';
                this.activeItem = itemNumber;
                items[this.activeItem].style.removeProperty('display');
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
