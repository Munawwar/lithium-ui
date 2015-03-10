define(['../core/Component', 'tpl!./Text.ko'], function (Lui) {
    /**
     * Text field.
     */
    Lui.Text = Lui.extend('Lui.Text', Lui.Component, {
        cls: Lui.Observable('form-control'),
        autocomplete: [],
        placeholder: Lui.Observable(''),
        getValue: function () {
            if (this.el) {
                return this.el.value;
            }
        },
        setValue: function (value) {
            if (this.el) {
                this.el.value = value;
            }
        },
        clear: function () {
            if (this.el) {
                this.el.value = '';
            }
        },
        /**
         * @override
         */
        makeConfigFromView: function (target) {
            var cfg = this.super(arguments),
                value = target.textContent;
            if (value) {
                cfg.value = value;
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

    return Lui;
});
