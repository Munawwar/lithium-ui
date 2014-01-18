/*globla $*/

INCLUDE('Alert.css');

INCLUDE('Component.js');

/**
 * Alert.
 */
Lui.extend('Lui.Alert', Lui.Component, {
    html: 'Alert!',
    alertType: 'warning',
    cls: 'alert alert-stick-top',

    closeBtn: true,

    /**
     * @override
     */
    getCssClass: function () {
        var cls = this.super(arguments);
        return cls + ' alert-' + this.alertType;
    },

    /**
     * @override
     */
    getHtml: function () {
        this.prepareTemplate();
        if (!this.tpl) {
            throw new Error("Can't find template for " + this.type);
        }
        return Li.format(this.tpl.text, {
            id: this.id,
            type: this.type,
            cls: this.getCssClass(),
            style: this.style,
            html: this.html
        });
    },

    render: function () {
        this.super(arguments);
        if (!this.closeBtn) {
            $('.close', this.rootEl).hide();
        }
    },

    /**
     * @override
     */
    postRender: function () {
        this.super(arguments);
        if (!this.closeBtn) {
            setTimeout(function () {
                $(this.rootEl).fadeOut(1000, this.unrender.bind(this));
            }.bind(this), 2000);
        } else {
            $(this.rootEl).on('click', this.unrender.bind(this));
        }
    },

    /**
     * Show alert
     */
    show: function () {
        $(this.rootEl).show(150);
    },

    /**
     * Hide alert
     */
    hide: function () {
        $(this.rootEl).hide(150);
    }
});
