define([
    '../core/Component',
    '../lib/lithium/src/lithium',
    'tpl!./Dropdown.html',
    'css!./Dropdown.css'
], function (Lui) {

    /**
     * Dropdown.
     */
    Lui.Dropdown = Lui.extend('Lui.Dropdown', Lui.Component, {
        /**
         * @cfg {Array[]} options Array of [value, display text] arrays.
         * Used only for first render.
         */
        options: [],
        /**
         * @cfg {Number} [defaultOption=0]
         */
        defaultOption: 0,
        getValue: function () {
            if (this.rootEl) {
                return this.rootEl.value;
            }
        },
        /**
         * Searches for the option with given value and sets it
         */
        setValue: function (value) {
            if (this.rootEl) {
                this.rootEl.value = value;
            }
        },
        clear: function () {
            if (this.rootEl) {
                this.rootEl.selectedIndex = this.defaultOption;
            }
        },
        postRender: function (target, childIndex) {
            //Populate options
            this.options.forEach(function (item) {
                if (Li.isString(item)) {
                    item = [item, item];
                }
                $(this.rootEl).append(Li.dom('<option value="{0}">{1}</option>', item[0], item[1]));
            }, this);
            this.super(arguments);
        }
    });

    return Lui;
});
