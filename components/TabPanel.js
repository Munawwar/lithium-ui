define(['./TabStrip', './Cards'], function (Li) {

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

        makeConfigFromView: function (element, cfg) {
            var children = {};
            Li.slice(element.children).forEach(function (el) {
                children[el.nodeName.toLowerCase()] = el;
            });

            if (!children['li-tabstrip'] || !children['li-cards']) {
                console.error('Invalid syntax for TabPanel');
            }
            children['li-tabstrip'].setAttribute('ref', 'tabstrip');
            children['li-cards'].setAttribute('ref', 'cards');

            return this.super(arguments);
        },

        constructor: function () {
            this.super(arguments);

            this.setActiveTab(this.tabstrip.activeItem);

            this.tabstrip.subscribe('tabchanged', function (itemNumber) {
                this.cards.setActiveItem(itemNumber);
            }, this);
        },

        setActiveTab: function (itemNumber) {
            this.tabstrip.setActiveItem(itemNumber);
            this.cards.setActiveItem(itemNumber);
        }
    });

    return Li;
});
