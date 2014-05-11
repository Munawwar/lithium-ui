INCLUDE('../core/Component.js');

/**
 * Text field.
 */
Lui.extend('Lui.Text', Lui.Component, {
    cls: 'form-control',
    autocomplete: [],
    placeholder: '',
    getValue: function () {
        if (this.rootEl) {
            return this.rootEl.value;
        }
    },
    setValue: function (value) {
        if (this.rootEl) {
            this.rootEl.value = value;
        }
    },
    /**
     * @override
     */
    makeConfigFromView: function (target) {
        var cfg = this.super(arguments),
            placeholder = target.getAttribute('placeholder'),
            value = target.textContent;
        if (placeholder) {
            cfg.placeholder = placeholder;
        }
        if (value) {
            cfg.value = value;
        }
        return cfg;
    },
    /**
     * @override
     */
    getOuterHtml: function () {
        return this.outerTpl.toDocumentFragment({
            id: this.id,
            type: this.type,
            cls: this.getCssClass(),
            style: this.style,
            value: this.value,
            placeholder: this.placeholder,
        });
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
            $(this.rootEl).autocomplete({
                source: this.autocomplete
            });
        }
    }
});
