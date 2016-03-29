/*globla $*/

define([
    '../core/Component',
    'jquery',
    'css!./Alert.css',
    'tpl!./Alert.ko'
], function (Li, $) {
    /**
     * Alert.
     */
    Li.Alert = Li.extend('Li.Alert', Li.Component, {
        html: 'Alert!',
        alertType: 'warning',
        cls: 'alert-stick-top',

        closeBtn: true,

        constructor: function () {
            this.addClass('alert-' + this.alertType);

            this.super(arguments);
        },

        render: function () {
            this.super(arguments);
            if (!this.closeBtn) {
                $('.close', this.el).hide();
            }
        },

        /**
         * @override
         */
        postRender: function () {
            this.super(arguments);
            if (!this.closeBtn) {
                setTimeout(function () {
                    $(this.el).fadeOut(1000, this.unrender.bind(this));
                }.bind(this), 2000);
            } else {
                $(this.el).on('click', this.unrender.bind(this));
            }
        },

        /**
         * Show alert
         */
        show: function () {
            $(this.el).show(150);
        },

        /**
         * Hide alert
         */
        hide: function () {
            $(this.el).hide(150);
        }
    });

    return Li;
});
