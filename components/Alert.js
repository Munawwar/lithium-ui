/*globla $*/

define([
    '../core/Component.js',
    './libs.js',

    './Alert.css!css',
    './Alert.ko!tpl'
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

        /**
         * @override
         */
        attach: function () {
            this.super(arguments);

            if (!this.closeBtn) {
                setTimeout(function () {
                    $(this.el).fadeOut(1000, this.detach.bind(this));
                }.bind(this), 2000);
            } else {
                $(this.el).on('click', this.detach.bind(this));
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
