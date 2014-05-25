define(['../core/Component'], function (Lui) {

/**
 * Button.
 */
Lui.Button = Lui.extend('Lui.Button', Lui.Component, {
    label: 'Button',
    cls: 'btn btn-default',
    /**
     * @override
     */
    makeConfigFromView: function (target) {
        var cfg = this.super(arguments);
        cfg.label = target.firstChild.nodeValue;
        cfg.disabled = target.hasAttribute('disabled');
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
            label: this.label,
            disabled: this.disabled ? '' : false
        });
    }
});

return Lui;
});
