INCLUDE('Component.js');
INCLUDE('Dropdown.css');

/**
 * Dropdown.
 */
Lui.extend('Lui.Dropdown', Lui.Component, {
    cls: 'lui-dropdown',
    options: [],
    /**
     * @override
     */
    getHtml: function () {
        var html = Li.format('<select id="{0}"', this.id),
            cls = this.getCssClass();
        html += cls ? Li.format(' class="{0}"', cls) : '';
        html += '></select>';
        return html;
    },
    postRender: function (target, childIndex) {
        //Populate options
        this.options.forEach(function (item) {
            if (Li.isString(item)) {
                item = [item, item];
            }
            $(this.rootEl).append(Li.dom('<option value="{0}">{1}</option>', item[0], item[1]));
        }, this);
        this.super(arguments);
    }
});
