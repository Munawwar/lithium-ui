define([
    '../core/Component',
    'jquery',
    'tpl!./Dropdown.ko',
    'css!./Dropdown.css'
], function (Li, $) {

    /**
     * Dropdown.
     */
    Li.Dropdown = Li.extend('Li.Dropdown', Li.Component, {
        cls: 'select-wrapper',
        /**
         * @cfg {Array[]} options Array of {value: <value>, text: <text>} objects.
         *  Optionally disabled property and cls property (for CSS class) is allowed.
         */
        options: Li.Observable([]),
        /**
         * @cfg {String} value
         */
        value: Li.Observable(''),
        /**
         * Disabled when true.
         */
        disabled: Li.Observable(false),
        /**
         * @cfg {Number} [defaultOption=0]
         */
        defaultOption: 0,

        /*Other configs*/
        inDuration: 300,
        outDuration: 225,
        constrain_width: true, // Constrains width of dropdown to the activator
        gutter: 0, // Spacing from edge
        belowOrigin: false,
        alignment: 'left',

        constructor: function (cfg) {
            //Initialize value
            cfg.options = cfg.options || [];
            var initialValue = (cfg.options.filter(function (option) {
                return option.selected;
            })[0] || {}).value;
            initialValue = initialValue || (cfg.options.length && (cfg.options[this.defaultOption] || {}).value) || this.value();
            this.value = Li.Observable(initialValue);

            this.super(arguments);

            document.body.appendChild(this.ulEl); //move ul to document body, since it is needs to be positioned absolute.

            this.on({
                inputEl: {
                    blur: this.onBlur,
                    click: this.onClick,
                    keydown: this.onKeyDown,
                    keyup: this.onKeyUp
                },
                ulEl: {
                    click: this.onItemClick
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
        getTextForValue: function (value) {
            return this.options().filter(function (option) {
                return (option.value === value);
            })[0].text;
        },
        /**
         * Send a value and get corresponding index of it.
         */
        getIndexOfValue: function (value) {
            var index = -1;
            this.options().some(function (option, i) {
                if (option.value === value) {
                    index = i;
                    return true;
                }
            });
            return index;
        },

        getValue: function () {
            return this.value();
        },
        /**
         * Searches for the option with given value and sets it
         */
        setValue: function (value) {
            if (this.getIndexOfValue(value) > -1) {
                this.value(value);
            }
        },
        clear: function () {
            this.value(this.options()[this.defaultOption].value);
        },

        /**
         * Initialize with given set of options. Optionally removes current options.
         */
        addOptions: function (arr, removeAll) {
            //Add disabled value if not present
            arr.forEach(function (item) {
                if (!Li.isObservable(item.disabled)) {
                    item.disabled = Li.Observable(typeof item.disabled === 'boolean' ? item.disabled : false);
                }
            });

            if (removeAll) {
                this.options(arr);

                //If no item with currently selected value exists, then reset selected value.
                var curValue = this.value(),
                    exists = arr.some(function (item) {
                        return (item.value === curValue);
                    }, this);
                if (!exists) {
                    var select = (this.defaultOption < arr.length ? this.defaultOption : 0);
                    this.value(arr[select].value);
                }
            } else {
                this.options(this.options().concat(arr));
            }
        },

        activateOption: function (collection, newOption) {
            collection.find('li.active').removeClass('active');
            $(newOption).addClass('active');
            //collection.scrollTo(newOption); //require jquery.scrollTo plugin
            newOption.scrollIntoView();
        },

        /**
         * Helper function to position and resize dropdown. Used in click handler.
         * @private
         */
        placeDropdown: function () {
            var options = this,
                origin = $(this.inputEl),
                activates = $(this.ulEl);

            // Set Dropdown state
            activates.addClass('active');
            origin.addClass('active');

            // Constrain width
            if (options.constrain_width === true) {
                activates.css('width', origin.outerWidth());
            } else {
                activates.css('white-space', 'nowrap');
            }

            // Position dropdown
            activates.css({
                position: 'absolute',
                display: 'block',
                opacity: 0
            });

            // Horizontal offscreen detection
            var offset = origin.offset();
            if (offset.left + activates.innerWidth() > $(window).width()) {
                options.alignment = 'right';
            } else if (offset.left - (activates.innerWidth() - origin.innerWidth()) < 0) {
                options.alignment = 'left';
            }

            Li.position({
                target: activates[0],
                anchor: [(options.alignment === 'left' ? 'start' : 'end'), 'start'],
                relTo: origin[0],
                relAnchor: [(options.alignment === 'left' ? 'start' : 'end'), 'start'],
                displace: [options.gutter, (options.belowOrigin ? origin.innerHeight() : 0)],
                allowOffscreen: false, //Make sure drop-down is fully visible.
                offscreenMargin: 5
            });

            //Make sure it is above modal windows. Is this a hack?
            if (Li.Modal && Li.Modal.stack.length) {
                activates.css({
                    zIndex: 1000 + Li.Modal.stack.length + 1,
                });
            } else {
                activates[0].style.removeProperty('z-index');
            }

            // Show dropdown
            var activatesHeight = activates.outerHeight();
            activates.stop(true, true).css({
                    opacity: 0,
                    height: 0,
                    'overflow-y': (activates[0].scrollHeight > activatesHeight ? 'scroll' : 'hidden')
                }).velocity({
                    height: activatesHeight
                }, {
                    queue: false,
                    duration: options.inDuration,
                    easing: 'easeOutCubic',
                    complete: function() {
                        $(this).css({
                            height: '',
                            'overflow-y': ''
                        });
                    }
                })
                .velocity({
                    opacity: 1
                }, {
                    queue: false,
                    duration: options.inDuration,
                    easing: 'easeOutSine',
                    complete: function () {
                        //Make input field writable for text search
                        origin[0].value = '';
                        origin[0].readOnly = false;
                    }
                });

            //reselect (in case it was changed last time due to arrow keys)
            activates.find('li.active').removeClass('active');
            var current = activates.find('li[data-value="' + this.value() + '"]');
            current.addClass('active');
            current[0].scrollIntoView();
        },

        hideDropdown: function () {
            var options = this,
                origin = $(this.inputEl),
                activates = $(this.ulEl);

            //make text field read-only again.
            window.clearTimeout(this.searchTimer);
            origin[0].value = this.getTextForValue(this.value());
            origin[0].readOnly = true;

            activates.fadeOut(options.outDuration);
            activates.removeClass('active');
            origin.removeClass('active');
        },

        onBlur: function () {
            this.hideDropdown();
        },

        onClick: function (e) {
            var origin = $(this.inputEl),
                activates = $(this.ulEl);

            if (!origin.hasClass('active')) {
                e.preventDefault(); // Prevents button click from moving window
                this.placeDropdown();
            } else { // If origin is clicked and menu is open, close menu
                this.hideDropdown();
                Li.off(document, 'click', this.onDocumentClick, this);
            }
            // If menu open, add click close handler to document
            if (activates.hasClass('active')) {
                Li.on(document, 'click', this.onDocumentClick, this);
            }
            if (document.activeElement !== this.inputEl) {
                this.inputEl.focus();
            }
        },

        onItemClick: function (e) {
            var li = e.target.closest('li');
            if (li) {
                // Check if option element is disabled
                if (!$(li).hasClass('disabled')) {
                    var value = li.getAttribute('data-value'),
                        prevValue = this.value();
                    this.value(value);
                    // Trigger onchange() event
                    this.trigger('change', {component: this, value: value, prevValue: prevValue});
                }
            }
            if (document.activeElement !== this.inputEl) {
                this.inputEl.focus();
            }
            e.stopPropagation();
        },

        /**
         * Listen to clicks outside dropdown when dropdown is open.
         * @private
         */
        onDocumentClick: function (e) {
            var origin = $(this.inputEl),
                activates = $(this.ulEl);
            if (!activates.is(e.target) && !origin.is(e.target) && !origin.find(e.target).length) {
                this.hideDropdown();
                Li.off(document, 'click', this.onDocumentClick, this);
            }
        },

        /**
         * Handles special keys such as arrow, tabs, esc etc
         * @private
         */
        onKeyDown: function (event) {
            var activates = $(this.ulEl),
                newOption, activeOption;

            // TAB - switch to another input
            if (event.which === 9) {
                return this.hideDropdown();
            }

            // ARROW DOWN WHEN SELECT IS CLOSED - open select options
            if (event.which === 40 && !activates.is(":visible")) {
                return this.placeDropdown();
            }

            // ENTER WHEN SELECT IS CLOSED - submit form
            if (event.which === 13 && !activates.is(":visible")) {
                return;
            }

            //Prevent default action for special keys (including left/right arrow key and Ctrl/Cmd-A
            //as they'd interfere with text search).
            if (([9,13,27,37,38,39,40]).indexOf(event.which) > -1 || event.ctrlKey || event.metaKey) {
                event.preventDefault();
            }

            // ENTER - select option and close when select options are opened
            if (event.which === 13) {
                activeOption = activates.find('li.active:not(.disabled)')[0];
                if (activeOption) {
                    $(activeOption).trigger('click');
                    this.hideDropdown();
                }
            }

            // ARROW DOWN - move to next not disabled option
            if (event.which === 40) {
                newOption = activates.find('li.active')[0];
                while ((newOption = newOption.nextElementSibling) && $(newOption).is('.disabled'));
                if (newOption) {
                    this.activateOption(activates, newOption);
                }
            }

            // ESC - close options
            if (event.which === 27) {
                this.hideDropdown();
            }

            // ARROW UP - move to previous not disabled option
            if (event.which === 38) {
                newOption = activates.find('li.active')[0];
                while ((newOption = newOption.previousElementSibling) && $(newOption).is('.disabled'));
                if (newOption) {
                    this.activateOption(activates, newOption);
                }
            }
        },

        /**
         * Implements options search.
         * @private
         */
        onKeyUp: function (event) {
            var activates = $(this.ulEl);
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
