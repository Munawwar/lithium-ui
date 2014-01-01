INCLUDE('Component.js');

/**
 * Button.
 */
Lui.extend('Lui.Button', Lui.Component, {
    label: 'Button',
    cls: 'btn btn-default',
    constructor: function () {
        this.super(arguments);
    },
    /**
     * @override
     */
    parseLV: function (target) {
        var cfg = this.super(arguments);
        //TODO: Parse atributes
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
            cls: this.getCssClass(),
            label: this.label,
            type: this.type
        });
    }
});
