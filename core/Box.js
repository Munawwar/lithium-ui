INCLUDE('Component.js');

/**
 * A container that can have child components.
 * You can use Box to achieve layouts.
 *
 * Note that postRender() method is called after renderOuter (i.e doesn't wait for child items to be rendered).
 */
Lui.extend('Lui.Box', Lui.Component, {
    /**
     * Child items
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
    parseLV: function (element, cfg) {
        if (!cfg) {
            this.prepareTemplate();
            cfg = this.super(arguments);
            delete cfg.html;
        }
        //Load template if any
        this.prepareTemplate();
        if (this.tpl) {
            var tplComps = Lui.parseLV(this.tpl.toDocumentFragment({}));
            if (tplComps.length) {
                cfg.items = tplComps;
            }
        }
        //Append the components from logical view.
        var lvComps = Lui.parseLV(element);
        if (lvComps.length) {
            cfg.items = (cfg.items || []).concat(lvComps);
        }
        return cfg;
    },

    init: function () {
        this.items.forEach(function (o, index) {
            o.type = o.type || 'Lui.Box';
            var classRef = Lui.getClass(o.type), cmp;
            if (!(o instanceof Lui.Component)) {
                o.parent = this;
                cmp = this.items[index] = new classRef(o);
                if (o.ref) {
                    var backsRegEx = /\.\.\//g,
                        backs = o.ref.match(backsRegEx);
                    o.ref = o.ref.replace(backsRegEx, '');

                    var rel = this;
                    for (backs = (backs ? backs.length : 0); backs > 0; backs -= 1) {
                        rel = rel.parent;
                    }

                    rel[o.ref] = cmp;
                    delete o.ref;
                }
            } else {
                o.parent = this;
            }
        }, this);
    },

    renderInner: function () {
        this.items.forEach(function(item, i) {
            item.render(this.rootEl, i);
        }, this);
    },
    unrender: function () {
        this.items.forEach(function(item) {
            item.unrender();
        }, this);
        this.super();
    },
    postRender: function () {
        this.removeListeners();
        this.initListeners();
        this.items.forEach(function(item) {
            item.postRender();
        }, this);
    }
});
