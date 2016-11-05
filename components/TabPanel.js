define(['./TabStrip.js', './Cards.js'], function (Li) {

    /**
     * TabPanel that needs to be initialized as follows in a template:
     * <li-tabpanel>
     *     <li-tabstrip>
     *         <button>Tab Button 1</button>
     *         <button>Tab Button 2</button>
     *     <li-tabstrip>
     *     <li-cards>
     *         <any-element-or-component>...</any-element-or-component>
     *         <any-element-or-component>...</any-element-or-component>
     *     </li-cards>
     * </li-tabpanel>
     *
     * Each of the li-* tags are converted to divs (since they inherit Li.Box).
     * Li.TabStrip is horizontal by default..so params isn't needed.
     * Check documentation for Li.TabStrip and Li.Cards for internal details.
     *
     * One can use class or style attribute with the tags as well. E.g:
     * <li-tabpanel class="hbox">
     *      <li-tabstrip params="align: 'vertical'">
     *          ...
     *      </li-tabstrip>
     *      <li-cards class="flex">
     *          ...
     *      </li-cards>
     * </li-tabpanel>
     */
    Li.TabPanel = Li.extend('Li.TabPanel', Li.Box, {

        constructor: function () {
            this.super(arguments);

            //Find TabStrip and Cards and set references
            this.view.getComponents().forEach(function (cmp) {
                if (!this.tabstrip && cmp instanceof Li.TabStrip) {
                    this.tabstrip = cmp;
                }
                if (!this.cards && cmp instanceof Li.Cards) {
                    this.cards = cmp;
                }
            }, this);

            if (!this.tabstrip || !this.cards) {
                console.error('TabPanel needs explicit declaration of Li.TabStrip and Li.Cards as it\'s child components.');
            }

            this.setActiveTab(this.tabstrip.activeItem);

            this.tabstrip.subscribe('tabchanged', function (e, cfg) {
                this.cards.setActiveItem(cfg.tabIndex);
            }, this);
        },

        /**
         * Activate item.
         * @param {Number|HTMLElement|Li.Component} item The card item number or reference.
         */
        setActiveTab: function (item) {
            var itemNumber = (Li.isNumber(item) ? item : Li.childIndex(item.el || item, true));
            this.tabstrip.setActiveItem(itemNumber);
            this.cards.setActiveItem(itemNumber);
        },

        /**
         * Get the active item number.
         */
        getActiveTab: function () {
            return this.tabstrip.getActiveItem();
        }
    });

    return Li;
});
