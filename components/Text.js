define(['../core/Component', 'tpl!./Text.ko'], function (Li) {
    /**
     * Text field.
     */
    Li.Text = Li.extend('Li.Text', Li.Component, {
        cls: Li.Observable('form-control'),
        autocomplete: [],
        placeholder: Li.Observable(''),
        getValue: function () {
            return this.el.value;
        },
        setValue: function (value) {
            this.el.value = value;
        },
        clear: function () {
            this.el.value = '';
        },
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
        /**
         * @override
         */
        postRender: function () {
            this.adjustAutoComplete();
            this.super(arguments);
        },
        /**
         * @private
         */
        adjustAutoComplete: function () {
            if (this.autocomplete.length) {
                $(this.el).autocomplete({
                    source: this.autocomplete
                });
            }
        }
    });

    return Li;
});
