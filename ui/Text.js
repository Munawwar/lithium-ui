INCLUDE('../core/Component.js');

/**
 * Text field.
 */
Lui.extend('Lui.Text', Lui.Component, {
    cls: 'form-control',
    autocomplete: [],
    placeholder: '',
    /**
     * @override
     */
    makeConfigFromViewImplementation: function (target) {
        var cfg = this.super(arguments),
            node = target.firstChild,
            placeholder = node.getAttribute('placeholder'),
            value = node.firstChild.nodeValue;
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
    getHtml: function () {
        if (!this.tpl) {
            throw new Error("Can't find template for " + this.type);
        }
        return this.tpl.toDocumentFragment({
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
