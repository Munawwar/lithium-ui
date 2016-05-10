define([
    '../core/Component',
    './Dropdown',

    'tpl!./SelectIcon.ko',
    'css!./SelectIcon.css'
], function (Li) {

    /**
     * Dropdown.
     */
    Li.SelectIcon = Li.extend('Li.SelectIcon', Li.Component, {
        cls: '',
        /**
         * Disabled when true.
         */
        disabled: Li.Observable(false),
        /**
         * @cfg {Number} [defaultOption=0]
         */
        defaultOption: 0,

        constructor: function (cfg) {
            this.dropdown = new Li.Dropdown({
                addClass: "selecticon-dropdown",
                removeClass: "select-dropdown",
                defaultOption: this.defaultOption,
                options: cfg.options
            });

            this.super(arguments);

            this.dropdown.set({fieldEl: this.buttonEl});

            this.on({
                buttonEl: {
                    click: this.dropdown.onClick.bind(this.dropdown),
                    blur: this.dropdown.onBlur.bind(this.dropdown),
                    keydown: this.dropdown.onKeyDown.bind(this.dropdown)
                },
                dropdown: {
                    $change: this.onChange
                }
            });
        },
        /**
         * Overrides base class method.
         */
        makeConfigFromView: function () {
            return Li.Dropdown.prototype.makeConfigFromView.apply(this, arguments);
        },

        /**
         * Send a value and get corresponding text for it.
         */
        getTextForValue: function () {
            return this.dropdown.getTextForValue.apply(this.dropdown, arguments);
        },
        /**
         * Send a value and get corresponding index of it.
         */
        getIndexOfValue: function () {
            return this.dropdown.getIndexOfValue.apply(this.dropdown, arguments);
        },

        /**
         * Get selected value.
         */
        getValue: function () {
            return this.dropdown.getValue.apply(this.dropdown, arguments);
        },
        /**
         * Searches for the option with given value and sets it
         */
        setValue: function () {
            return this.dropdown.setValue.apply(this.dropdown, arguments);
        },

        /**
         * Initialize with given set of options. Optionally removes current options.
         */
        addOptions: function () {
            return this.dropdown.addOptions.apply(this.dropdown, arguments);
        },

        activateOption: function () {
            return this.dropdown.activateOption.apply(this.dropdown, arguments);
        },

        /**
         * Helper function to position and resize dropdown. Used in click handler.
         * @private
         */
        placeDropdown: function (e) {
            return this.dropdown.show(e);
        },

        hideDropdown: function () {
            return this.dropdown.hide();
        },

        render: function () {
            this.dropdown.render(document.body);
            this.super(arguments);
        },

        onChange: function (cfg) {
            cfg.component = this;
            this.trigger('change', cfg);
        }
    });

    return Li;
});
