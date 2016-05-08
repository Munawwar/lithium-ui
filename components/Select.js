define([
    '../core/Component',
    'jquery',

    './Dropdown',
    'tpl!./Select.ko'
], function (Li, $) {

    /**
     * Dropdown.
     */
    Li.Select = Li.extend('Li.Select', Li.Component, {
        cls: 'select-wrapper',
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
                defaultOption: this.defaultOption,
                options: cfg.options
            });

            this.super(arguments);

            this.dropdown.set({fieldEl: this.inputEl});

            this.on({
                inputEl: {
                    click: this.dropdown.onClick.bind(this.dropdown),
                    blur: this.dropdown.onBlur.bind(this.dropdown),
                    keydown: this.dropdown.onKeyDown.bind(this.dropdown),
                    keyup: this.onKeyUp
                },
                dropdown: {
                    $change: this.onChange,
                    $opened: function () {
                        //Make input field writable for text search
                        this.inputEl.value = '';
                        this.inputEl.readOnly = false;
                    },
                    $closed: function () {
                        //make text field read-only again.
                        window.clearTimeout(this.searchTimer);
                        this.inputEl.value = this.getTextForValue(this.getValue());
                        this.inputEl.readOnly = true;
                    }
                }
            });
        },
        /**
         * Overrides base class method.
         */
        makeConfigFromView: function (element, cfg) {
            cfg = this.super(arguments);
            cfg.options = Li.slice(cfg.innerTpl.frag.querySelectorAll('option')).map(function (el) {
                return {
                    value: el.hasAttribute('value') ? el.getAttribute('value') : el.textContent,
                    text: el.textContent,
                    cls: el.getAttribute('class') || '',
                    disabled: Li.Observable(el.hasAttribute('disabled')),
                    selected: el.hasAttribute('selected'),
                };
            });
            cfg.innerTpl = null;
            return cfg;
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

        onChange: function (cfg) {
            cfg.component = this;
            this.trigger('change', cfg);
        },

        /**
         * Implements options search.
         * @private
         */
        onKeyUp: function (event) {
            var activates = $(this.dropdown.el);
            //ignore keys when dropdown is closed.
            if (!activates.hasClass('active')) {
                return;
            }

            // CASE WHEN USER TYPE LETTERS
            var searchText = this.inputEl.value,
                nonLetters = [9,13,27,37,38,39,40];
            if (searchText && (nonLetters.indexOf(event.which) === -1) && !event.ctrlKey && ! event.metaKey) {
                var newOption = activates.find('li').filter(function() {
                    return $(this).text().toLowerCase().indexOf(searchText) === 0;
                })[0];

                if (newOption) {
                    this.activateOption(activates, newOption);
                }
            }

            if (searchText) {
                // Automaticaly clean filter query so user can search again by starting letters
                window.clearTimeout(this.searchTimer);
                this.searchTimer = window.setTimeout(function () {
                    this.inputEl.value = '';
                }.bind(this), 1000);
            }
        }
    });

    return Li;
});
