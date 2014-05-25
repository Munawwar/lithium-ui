define(['./Component'], function (Lui) {

    /**
     * A container that can have child components.
     * You can use Box to achieve layouts.
     *
     * Note that postRender() method is called after renderOuter (i.e doesn't wait for child items to be rendered).
     */
    Lui.Box = Lui.extend('Lui.Box', Lui.Component, {
        /**
         * Child items
         * @type Array[Lui.Component|String]
         */
        items: [],

        constructor: function () {
            this.items = []; //Avoiding array reference to prototype.

            this.super(arguments);
            this.init();
        },

        /**
         * Override
         */
        makeConfigFromView: function (element, cfg) {
            if (!cfg) {
                cfg = this.super(arguments);
                delete cfg.innerTpl;
            }

            //If view implementation has child component markup in it, then use them (effectively this overrides innerTpl of this component)...
            if (element.children.length) {
                var lvComps = Lui.makeConfigFromView(element);
                if (lvComps.length) {
                    cfg.items = (cfg.items || []).concat(lvComps);
                }
            } else { //..else load template if any
                if (this.innerTpl) {
                    var tplComps = Lui.makeConfigFromView(this.innerTpl.toDocumentFragment({}));
                    if (tplComps.length) {
                        cfg.items = tplComps;
                    }
                }
            }
            return cfg;
        },

        init: function () {
            this.items = Lui.create(this.items, this);
        },

        renderInner: function () {
            Lui.render(this.rootEl, this.items);
        },
        unrender: function () {
            this.items.forEach(function(item) {
                if (item instanceof Lui.Component) {
                    item.unrender();
                }
            }, this);
            this.super();
        },
        postRender: function () {
            this.attachListeners();
            this.items.forEach(function(item) {
                if (item instanceof Lui.Component) {
                    item.postRender();
                }
            }, this);
        }
    });

    return Lui;
});
