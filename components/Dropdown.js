define([
    './Popover.js',
    'jquery',
    './Dropdown.ko!tpl'
], function (Li, $) {

    /**
     * Dropdown component. It cannot be used without first filling the
     * fieldEl property (the element that triggers the dropdown to show).
     */
    Li.Dropdown = Li.extend('Li.Dropdown', Li.Popover, {
        /**
         * List item template.
         */
        listItemTpl: null,

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

        /**
         * The field element (like input or button tag) which triggers the dropdown.
         * @type {HTMLElement}
         */
        fieldEl: null,

        /**
         * Extends base class method.
         */
        afterExtend: function (proto) {
            proto.constructor.super.afterExtend(proto);

            var tpl;
            if (proto === Li.getClass('Li.Dropdown').prototype || (proto instanceof Li.Dropdown)) {
                var prefix = proto.type.toLowerCase().replace(/\./g, '-');
                tpl = Li.findTemplate('id', prefix + '-listitem');
                if (tpl) {
                    proto.listItemTpl = tpl;
                }
            }
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

        constructor: function (cfg) {
            this.fieldEl = cfg.fieldEl;

            //Initialize value
            cfg.options = cfg.options || [];
            var initialValue = (cfg.options.filter(function (option) {
                return option.selected;
            })[0] || {}).value;
            initialValue = initialValue || (cfg.options.length && (cfg.options[this.defaultOption] || {}).value) || this.value();
            this.value = Li.Observable(initialValue);

            this.super(arguments);

            this.on({
                click: this.onItemClick
            });
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

        /**
         * Get selected value.
         */
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
        show: function (e) {
            var options = this,
                origin = $(this.fieldEl),
                activates = $(this.el);

            // Set Dropdown state
            activates.addClass('active');
            origin.addClass('active');
            origin[0].setAttribute('aria-expanded', 'true');

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

            this.super([e, {
                anchor: [(options.alignment === 'left' ? 'start' : 'end'), 'start'],
                relTo: origin[0],
                relAnchor: [(options.alignment === 'left' ? 'start' : 'end'), 'start'],
                displace: [options.gutter, (options.belowOrigin ? origin.innerHeight() : 0)],
                allowOffscreen: false, //Make sure drop-down is fully visible.
                offscreenMargin: 5
            }]);

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
                        this.trigger('opened');
                    }.bind(this)
                });

            //reselect (in case it was changed last time due to arrow keys)
            activates.find('li.active').removeClass('active');
            var current = activates.find('li[data-value="' + this.value() + '"]');
            current.addClass('active');
            current[0].scrollIntoView();
        },

        hide: function () {
            var options = this,
                origin = $(this.fieldEl),
                activates = $(this.el);

            if (activates.hasClass('active')) {
                activates.removeClass('active');
                origin.removeClass('active');
                origin[0].setAttribute('aria-expanded', 'false');

                this.super([{duration: options.outDuration}]);

                this.trigger('closed');
            }
        },

        onClick: function (e) {
            var activates = $(this.el);

            if (!activates.hasClass('active')) {
                this.show(e);
                e.preventDefault(); //prevent focus from moving to any other element.
            } else { // If origin is clicked and menu is open, close menu
                this.hide();
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
                    this.trigger('change', {prevValue: prevValue});
                }
            }
            this.trigger('clicked');

            this.hide();
            e.stopPropagation();
        },

        /**
         * Handles special keys such as arrow, tabs, esc etc
         * @private
         */
        onKeyDown: function (event) {
            var activates = $(this.el),
                newOption, activeOption;

            // TAB - switch to another input
            if (event.which === 9) {
                return this.hide();
            }

            // ARROW DOWN WHEN SELECT IS CLOSED - open select options
            if (event.which === 40 && !activates.is(":visible")) {
                return this.show(event);
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
                    this.hide();
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
                this.hide();
            }

            // ARROW UP - move to previous not disabled option
            if (event.which === 38) {
                newOption = activates.find('li.active')[0];
                while ((newOption = newOption.previousElementSibling) && $(newOption).is('.disabled'));
                if (newOption) {
                    this.activateOption(activates, newOption);
                }
            }
        }
    });

    return Li;
});
