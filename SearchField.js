INCLUDE('Component.js');
INCLUDE('SearchField.css');

/**
 * Text field.
 */
Lui.extend('Lui.SearchField', Lui.Component, {
    extraCls: 'lui-searchfield',
    autocomplete: [],
    placeholder: '',
    /**
     * @returns {String} The html string to be used by {@link #render} method.
     * @protected
     */
    getCssClass: function () {
        return this.extraCls + ' ' + this.cls;
    },
    /**
     * @returns {String} The html string to be used by {@link #render} method.
     * @protected
     */
    getHtml: function () {
        var html = Li.format('<div id="{0}"', this.id),
            cls = this.getCssClass();
        html += cls ? Li.format(' class="{0}"', cls) : '';
        html += Li.format('><input type="text" placeholder="{0}"/></div>', this.placeholder);
        return html;
    },
    postRender: function (target, childIndex) {
        this.inputEl = $('input', this.rootEl)[0];
        this.adjustAutoComplete();
        this.super(arguments);
    },
    adjustAutoComplete: function () {
        $(this.inputEl).autocomplete({
            source: this.autocomplete
        });
    }
});
