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
        this.items.forEach(function (o, index) {
            if (Li.isString(o)) {
                return;
            }
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
        this.removeListeners();
        this.initListeners();
        this.items.forEach(function(item) {
            if (item instanceof Lui.Component) {
                item.postRender();
            }
        }, this);
    }
});
