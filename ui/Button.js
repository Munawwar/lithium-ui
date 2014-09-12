define(['../core/Component', 'tpl!./Button.ko'], function (Lui) {

    /**
     * Button.
     */
    Lui.Button = Lui.extend('Lui.Button', Lui.Component, {
        label: 'Button',
        cls: 'btn btn-default',
        /**
         * Disabled when true.
         */
        disabled: false,
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
            this.disabled = false;
            this.rootEl.disabled = false;
        },

        disable: function () {
            this.disabled = true;
            this.rootEl.disabled = true;
        }
    });

    return Lui;
});
