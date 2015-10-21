define(['../core/Component', '../core/Observable', 'tpl!./Button.ko'], function (Li) {

    /**
     * Button.
     */
    Li.Button = Li.extend('Li.Button', Li.Component, {
        cls: Li.Observable('btn btn-default'),
        /**
         * Text to display on button
         */
        label: Li.Observable('Button'),
        /**
         * Disabled when true.
         */
        disabled: Li.Observable(false),
        /**
         * @override
         */
        makeConfigFromView: function (target) {
            var cfg = this.super(arguments);
            cfg.label = (target.firstChild || {}).nodeValue;
            cfg.disabled = target.hasAttribute('disabled');
            return cfg;
        },

        enable: function () {
            this.disabled(false);
        },

        disable: function () {
            this.disabled(true);
        }
    });

    return Li;
});
