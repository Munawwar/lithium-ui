define([
    '../core/Box.js',
    'jquery',

    './TabStrip.ko!tpl'
], function (Li, $) {

    /**
     * TabPanel that needs to be initialized as follows in a template:
     * <li-tabstrip>
     *     <button>Tab Button 1</button>
     *     <button>Tab Button 2</button>
     * <li-tabstrip>
     *
     * Use params attribute to set horizontal or veritcal tabs. (Horizontal by default).
     * <li-tabstrip params="align: 'vertical'">
     *     ...
     * </li-tabstrip>
     */
    //TODO: align option hasn't be implemented
    Li.TabStrip = Li.extend('Li.TabStrip', Li.Box, {
        /**
         * Active tab item.
         */
        activeItem: 0,

        align: Li.Observable('horizontal'),

        makeConfigFromView: function (element, cfg) {
            var warn = false;
            Li.slice(element.children).forEach(function (el) {
                if (el.nodeName.toLowerCase() !== 'button') {
                     warn = true;
                }
                $(el).attr({
                    role: 'tab',
                    'aria-selected': 'false'
                });
            });
            if (warn) {
                console.warn('Use only <button> tags in TabStrip.');
            }

            return this.super(arguments);
        },

        constructor: function (cfg) {
            /**
             * @event tabchanged Fires when user changes tab.
             * Doesn't fire on API calls (non-user interaction changes).
             */

            cfg.addClass = ((cfg.addClass || '') + ' ' + this.align()).trim();

            this.super(arguments);

            this.on({
                click: this.onClick
            });
        },

        /**
         * @param {HTMLButtonElement|Object} btn Either a button element or object with text.
         */
        addTab: function (btn) {
            if (!(btn instanceof HTMLButtonElement)) {
                btn = $('<button>' + btn.text + '</button>')[0];
            }
            this.tabsEl.appendChild(btn);
            btn.classList.add('tab');
        },

        /**
         * Activate item.
         * @param {Number|HTMLElement|Li.Component} item The card item number or reference.
         */
        setActiveItem: function (item) {
            var itemNumber = (Li.isNumber(item) ? item : Li.childIndex(item.el || item, true));
            if (itemNumber >= 0 && itemNumber < this.tabsEl.children.length) {
                var prevItemNumber = this.activeItem;
                this.activeItem = itemNumber;
                this.tabsEl.children[prevItemNumber].classList.remove('active');
                this.tabsEl.children[prevItemNumber].setAttribute('aria-selected', 'false');
                this.tabsEl.children[itemNumber].classList.add('active');
                this.tabsEl.children[itemNumber].setAttribute('aria-selected', 'true');
                this.showIndicator(prevItemNumber);
            }
        },

        /**
         * Get the active item number. If returnDom param is set to true, then returns the active item's DOM node.
         */
        getActiveItem: function (returnDom) {
            return (!returnDom ? this.activeItem : this.el.children[this.activeItem]);
        },

        /**
         * Code taken from materializecss tabs.js.
         * @private
         */
        showIndicator: function (prevItemNumber) {
            if (!this.isDisplayed()) {
                return;
            }
            var $this = $(this.tabsEl),
                $tabs_width = $this.width(),
                $tab_width = $this.find('.tab').first().outerWidth(),
                $index = this.activeItem,
                $prev_index = prevItemNumber,
                $indicator = $(this.indicatorEl);
            // Update indicator
            if (($index - $prev_index) >= 0) {
                $indicator.velocity({
                    "right": Math.max(0, $tabs_width - (($index + 1) * $tab_width))
                }, { duration: 300, queue: false, easing: 'easeOutQuad'});
                $indicator.velocity({
                    "left": Math.max(0, $index * $tab_width)
                }, {duration: 300, queue: false, easing: 'easeOutQuad', delay: 90});
            } else {
                $indicator.velocity({
                    "left": Math.max(0, $index * $tab_width)
                }, { duration: 300, queue: false, easing: 'easeOutQuad'});
                $indicator.velocity({
                    "right": Math.max(0, $tabs_width - (($index + 1) * $tab_width))
                }, {duration: 300, queue: false, easing: 'easeOutQuad', delay: 90});
            }
        },

        attach: function () {
            this.super(arguments);

            //Hide all
            Li.slice(this.tabsEl.children).forEach(function (el) {
                el.classList.add('tab');
            });
            //Unhide active one
            this.setActiveItem(this.activeItem);
        },

        onClick: function (ev) {
            if (this.tabsEl.contains(ev.target)) {
                var target = $(ev.target).closest('button')[0],
                    itemNumber = $(target).index();

                this.setActiveItem(itemNumber);
                this.trigger('tabchanged', {tabIndex: itemNumber});
            }
        }
    });

    return Li;
});
