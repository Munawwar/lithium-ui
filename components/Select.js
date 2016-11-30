define([
    '../core/Component.js',
    'jquery',

    './Dropdown.js',
    './Select.ko!tpl',
    './Select.css!css'
], function (Li, $) {

    /**
     * Select component.
     * It can also be styled as an action-menu by adding "action-menu nocaret" CSS classes and removing
     * "mimick-textfield" CSS class.
       ```html
        <li-select class="fa fa-ellipsis-v action-menu nocaret" params="removeClass: 'mimick-textfield'">
            ...
        </li-select>
        ```
     */
    Li.Select = Li.extend('Li.Select', Li.Component, {
        /**
         * Disabled when true.
         */
        disabled: Li.Observable(false),
        /**
         * @cfg {Number} [defaultOption=0]
         */
        defaultOption: 0,

        constructor: function (cfg) {
            this.dropdown = new Li.Dropdown(Object.assign(cfg.dropdownCfg || {}, {
                defaultOption: this.defaultOption,
                options: cfg.options
            }));
            this.inputEl = Li.Select.inputEl;
            if (!document.body.contains(this.inputEl)) {
                document.body.appendChild(this.inputEl);
            }

            this.super(arguments);

            this.dropdown.set({
                fieldEl: this.el,
                constrain_width: !this.el.classList.contains('action-menu')
            });


            this.on({
                click: this.dropdown.onClick.bind(this.dropdown),
                keydown: this.dropdown.onKeyDown.bind(this.dropdown),

                dropdown: {
                    $change: this.onChange,
                    $opened: function () {
                        //Make input field writable for text search
                        this.inputEl.value = '';
                        this.inputEl.style.width = this.el.clientWidth + 'px';
                        Li.position({
                            target: this.inputEl,
                            relTo: this.el,
                            anchor: ['start', 'start'],
                            relAnchor: ['start', 'start'],
                            allowOffscreen: true
                        });
                        this.inputEl.hidden = false;
                        this.inputEl.style.removeProperty('display');

                        this.inputEl.focus();

                        Li.on(this.inputEl, 'keydown', this.dropdown.onKeyDown, this.dropdown);
                        Li.on(this.inputEl, 'keyup', this.onKeyUp, this);

                        this.trigger('opened');
                    },
                    $closed: function () {
                        //make text field read-only again.
                        window.clearTimeout(this.searchTimer);

                        Li.off(this.inputEl, 'keydown', this.dropdown.onKeyDown, this.dropdown);
                        Li.off(this.inputEl, 'keyup', this.onKeyUp, this);

                        this.inputEl.hidden = true;
                        this.inputEl.style.display = 'none';

                        this.el.focus();
                        this.trigger('closed');
                    },
                    $clicked: function () {
                        this.trigger('itemclicked');
                    }
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

        attach: function () {
            this.dropdown.attach(document.body);
            this.super(arguments);
        },

        onChange: function (event, cfg) {
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
                    return $(this).text().trim().toLowerCase().indexOf(searchText) === 0;
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
        },

        statics: {
            inputEl: $.parseHTML('<input type="text" hidden style="position:absolute; min-height: 12px; display: none;" />')[0]
        }
    });

    return Li;
});
