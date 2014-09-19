define(['../core/Component', '../core/Observable', 'tpl!./Button.ko'], function (Lui) {

    /**
     * Button.
     */
    Lui.Button = Lui.extend('Lui.Button', Lui.Component, {
        cls: 'btn btn-default',
        /**
         * Text to display on button
         */
        label: Lui.Observable('Button'),
        /**
         * Disabled when true.
         */
        disabled: Lui.Observable(false),
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

    return Lui;
});
