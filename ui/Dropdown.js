define([
    '../core/Component',
    '../lib/lithium/src/lithium',
    'tpl!./Dropdown.ko',
    'css!./Dropdown.css'
], function (Lui, Li) {

    /**
     * Dropdown.
     */
    Lui.Dropdown = Lui.extend('Lui.Dropdown', Lui.Component, {
        /**
         * @cfg {Array[]} options Array of [value, display text] arrays.
         * Used only for first render.
         */
        options: Lui.ObservableArray(),
        /**
         * @cfg {Number} [defaultOption=0]
         */
        defaultOption: 0,
        /**
         * Overrides base class method.
         */
        makeConfigFromView: function (element) {
            var cfg = this.super(arguments);
            cfg.options = [];
            Li.slice(cfg.innerTpl.querySelectorAll('option')).forEach(function (el) {
                cfg.options.push([el.getAttribute('value'), el.textContent]);
            });
            cfg.innerTpl = null;
            return cfg;
        },
        getValue: function () {
            if (this.el) {
                return this.el.value;
            }
        },
        /**
         * Searches for the option with given value and sets it
         */
        setValue: function (value) {
            if (this.el) {
                this.el.value = value;
            }
        },
        clear: function () {
            if (this.el) {
                this.el.selectedIndex = this.defaultOption;
            }
        }
    });

    return Lui;
});
