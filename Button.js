INCLUDE('Component.js');

/**
 * Button.
 */
Lui.extend('Lui.Button', Lui.Component, {
    label: 'Button',
    cls: 'btn btn-default',
    /**
     * @override
     */
    parseLV: function (target) {
        var cfg = this.super(arguments);
        cfg.label = target.firstChild.nodeValue;
        return cfg;
    },
    /**
     * @override
     */
    getHtml: function () {
        if (!this.tpl) {
            throw new Error("Can't find template for " + this.type);
        }
        return Li.format(this.tpl.text, {
            id: this.id,
            type: this.type,
            cls: this.getCssClass(),
            style: this.style,
            label: this.label,
        });
    }
});
