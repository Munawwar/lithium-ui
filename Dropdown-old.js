INCLUDE('Component.js');
INCLUDE('Dropdown.css');

/**
 * Dropdown.
 */
Lui.extend('Lui.Dropdown', Lui.Component, {
    cls: 'lui-dropdown',
    options: [],
    /**
     * @returns {String} The html string to be used by {@link #render} method.
     * @protected
     */
    getHtml: function () {
        var html = Li.format('<div id="{0}"', this.id),
            cls = this.getCssClass();
        html += cls ? Li.format(' class="{0}"', cls) : '';
        html += '>';

        html += '<div>' +
                    '<button class="label-btn">&nbsp;</button>' +
                    '<button class="split-btn">Select an option</button>' +
                '</div>' +
                '<ul class="options"><ul>';
        html += '</div>';
        return html;
    },
    postRender: function (target) {
        var root = $(this.rootEl),
            firstBtn = $('.label-btn', root).button({label: this.options[0] || '&nbsp;'}),
            options = $('.options', root),
            clickHandler = function () {
                var menu = options.show().position({
                    my: "left top",
                    at: "left bottom",
                    of: firstBtn
                });
                $(document).one('click', function () {
                    menu.hide();
                });
                return false;
            },
            secondBtn = firstBtn.click(clickHandler)
            .next()
            .button({
                text: false,
                icons: {
                    primary: "ui-icon-triangle-1-s"
                }
            });

        secondBtn
            .click(clickHandler)
            .parent()
            .buttonset()
            .next()
            .hide()
            .menu();

        //Populate options
        options.css({
            width: parseInt(firstBtn.width(), 10) + parseInt(secondBtn.width(), 10)
        });
        this.options.forEach(function (item) {
            options.append(Li.dom('<li>' + item + '</li>'));
        }, this);

        this.super(arguments);
    }
});
