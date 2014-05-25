define(['../core/Component', '../lib/lithium/src/lithium', 'css!./Dropdown.css'], function (Lui) {

    /**
     * Dropdown.
     */
    Lui.Dropdown = Lui.extend('Lui.Dropdown', Lui.Component, {
        options: [],
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
        getOuterHtml: function () {
            var html = Li.format('<select id="{0}"', this.id),
                cls = this.getCssClass();
            html += cls ? Li.format(' class="{0}"', cls) : '';
            html += '></select>';
            return Li.dom(html);
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

    return Lui;
});
