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
         * @cfg {Array[]} options Array of {value: <value>, text: <text>} objects. Optionally disabled property is allowed.
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
            var initialValue = (cfg.options.filter(function (option) {
                return option.selected;
            })[0] || {}).value;
            initialValue = initialValue || cfg.options[this.defaultOption].value;
            this.value = Li.Observable(initialValue);

            this.super(arguments);

            this.on({
                $open: this.placeDropdown,
                $close: this.hideDropdown,
                inputEl: {
                    blur: this.onBlur,
                    click: this.onClick,
                    keydown: this.onKeyDown,
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
            cfg.options = [];
            Li.slice(cfg.innerTpl.frag.querySelectorAll('option')).forEach(function (el) {
                var option = {
                    value: el.hasAttribute('value') ? el.getAttribute('value') : el.textContent,
                    text: el.textContent,
                    class: el.getAttribute('class') || '',
                    disabled: Li.Observable(el.hasAttribute('disabled')),
                    selected: el.hasAttribute('selected'),
                };
                cfg.options.push(option);
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

            // Constrain width
            if (options.constrain_width === true) {
                activates.css('width', origin.outerWidth());
            } else {
                activates.css('white-space', 'nowrap');
            }
            var offset = 0;
            if (options.belowOrigin === true) {
                offset = origin.height();
            }

            // Offscreen detection
            var offsetLeft = origin.offset().left;
            var activatesLeft, width_difference, gutter_spacing;
            if (offsetLeft + activates.innerWidth() > $(window).width()) {
                options.alignment = 'right';
            } else if (offsetLeft - activates.innerWidth() + origin.innerWidth() < 0) {
                options.alignment = 'left';
            }

            // Handle edge alignment
            if (options.alignment === 'left') {
                width_difference = 0;
                gutter_spacing = options.gutter;
                activatesLeft = origin.position().left + width_difference + gutter_spacing;

                // Position dropdown
                activates.css({
                    left: activatesLeft
                });
            } else if (options.alignment === 'right') {
                var offsetRight = $(window).width() - offsetLeft - origin.innerWidth();
                width_difference = 0;
                gutter_spacing = options.gutter;
                activatesLeft = ($(window).width() - origin.position().left - origin.innerWidth()) + gutter_spacing;

                // Position dropdown
                activates.css({
                    right: activatesLeft
                });
            }
            // Position dropdown
            activates.css({
                position: 'absolute',
                top: origin.position().top + offset,
            });

            // Show dropdown
            activates.stop(true, true).css('opacity', 0)
                .slideDown({
                    queue: false,
                    duration: options.inDuration,
                    easing: 'easeOutCubic',
                    complete: function() {
                        $(this).css('height', '');
                    }
                })
                .animate({
                    opacity: 1
                }, {
                    queue: false,
                    duration: options.inDuration,
                    easing: 'easeOutSine'
                });
        },

        hideDropdown: function () {
            var options = this,
                activates = $(this.ulEl);
            activates.fadeOut(options.outDuration);
            activates.removeClass('active');
        },

        onBlur: function () {
            this.trigger('close');
        },

        onClick: function (e) {
            var origin = $(this.inputEl),
                activates = $(this.ulEl);

            if (!origin.hasClass('active')) {
                e.preventDefault(); // Prevents button click from moving window
                this.placeDropdown();
            } else { // If origin is clicked and menu is open, close menu
                this.hideDropdown();
                $(document).unbind('click.' + this.id);
            }
            // If menu open, add click close handler to document
            if (activates.hasClass('active')) {
                $(document).bind('click.'+ this.id, function (e) {
                    if (!activates.is(e.target) && !origin.is(e.target) && !origin.find(e.target).length) {
                        this.hideDropdown();
                        $(document).unbind('click.' + this.id);
                    }
                }.bind(this));
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
                    var value = li.getAttribute('data-value');
                    this.value(value);
                    // Trigger onchange() event
                    this.trigger('change', value);
                }
            }
            if (document.activeElement !== this.inputEl) {
                this.inputEl.focus();
            }
        },

        /**
         * Handles special keys such as arrow, tabs, esc etc
         */
        onKeyDown: function (event) {
            var newOption, activeOption;

            // TAB - switch to another input
            if (event.which === 9) {
                return this.trigger('close');
            }

            // ARROW DOWN WHEN SELECT IS CLOSED - open select options
            if (event.which === 40 && !$(this.ulEl).is(":visible")) {
                return this.trigger('open');
            }

            // ENTER WHEN SELECT IS CLOSED - submit form
            if (event.which === 13 && !$(this.ulEl).is(":visible")) {
                return;
            }

            event.preventDefault();

            // ENTER - select option and close when select options are opened
            if (event.which === 13) {
                activeOption = $(this.ulEl).find('li.active:not(.disabled)')[0];
                if (activeOption) {
                    $(activeOption).trigger('click');
                    this.trigger('close');
                }
            }

            // ARROW DOWN - move to next not disabled option
            if (event.which === 40) {
                newOption = $(this.ulEl).find('li.active').next('li:not(.disabled)')[0];
                if (newOption) {
                    this.activateOption($(this.ulEl), newOption);
                }
            }

            // ESC - close options
            if (event.which === 27) {
                this.trigger('close');
            }

            // ARROW UP - move to previous not disabled option
            if (event.which === 38) {
                newOption = $(this.ulEl).find('li.active').prev('li:not(.disabled)')[0];
                if (newOption) {
                    this.activateOption($(this.ulEl), newOption);
                }
            }
        }
    });

    return Li;
});
