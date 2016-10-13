define([
    '../core/Component.js',
    'jquery',

    './Text.ko!tpl'
], function (Li, $) {
    /**
     * Text field.
     */
    Li.Text = Li.extend('Li.Text', Li.Component, {
        placeholder: Li.Observable(''),

        /**
         * @override
         */
        makeConfigFromView: function (target, cfg) {
            cfg = this.super(arguments);
            if (cfg.value === undefined) {
                cfg.value = target.textContent || cfg.value; //if no text, set back to undefined
            }
            return cfg;
        },

        getValue: function () {
            return this.el.value;
        },
        setValue: function (value) {
            this.el.value = value;
        },
        clear: function () {
            this.el.value = '';
        }
    });

    /*
     * Code from Materialize CSS
     */
    // Function to update labels of text fields
    (function () {
        Li.Text.update = function (rootEl) {
            var input_selector = 'input[type=text], input[type=password], input[type=email], input[type=url], input[type=tel], input[type=number], input[type=search], textarea';
            $(input_selector, rootEl).each(function(index, element) {
                if ($(element).val().length > 0 || $(this).attr('placeholder') !== undefined) {
                    $(this).siblings('label').addClass('active');
                } else {
                    $(this).siblings('label, i').removeClass('active');
                }
            });
        };

        // Text based inputs
        var input_selector = 'input[type=text], input[type=password], input[type=email], input[type=url], input[type=tel], input[type=number], input[type=search], textarea';

        // Handle HTML5 autofocus
        $('input[autofocus]').siblings('label, i').addClass('active');

        // Add active if form auto complete
        $(document).on('change', input_selector, function () {
            if($(this).val().length !== 0 || $(this).attr('placeholder') !== undefined) {
                $(this).siblings('label').addClass('active');
            }
        });

        // Add active if input element has been pre-populated on document ready
        $(document).ready(function() {
            Li.Text.update();
        });

        // Add active when element has focus
        $(document).on('focus', input_selector, function () {
            $(this).siblings('label, i').addClass('active');
        });

        $(document).on('blur', input_selector, function () {
            var $inputElement = $(this);
            if ($inputElement.val().length === 0 && $inputElement.attr('placeholder') === undefined) {
                $inputElement.siblings('label, i').removeClass('active');
            }

            if ($inputElement.val().length === 0 && $inputElement.attr('placeholder') !== undefined) {
                $inputElement.siblings('i').removeClass('active');
            }
        });
    }());

    return Li;
});
