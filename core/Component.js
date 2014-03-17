INCLUDE('lui.js');
INCLUDE('util/Template.js');

/**
 * Base class for all components.
 */
Lui.extend('Lui.Component', Li.Observable, {
    /**
     * Top most element of this component
     * @readonly
     */
    rootEl: null,
    /**
     * Inner html string
     */
    html: '',
    /**
     * CSS class to use on {@link #rootEl}.
     */
    cls: '',
    /**
     * Inline CSS style to apply on {@link #rootEl}.
     */
    style: '',
    /**
     * The component's template that is within script tag with data-type=<type of component>.
     * Original tpl would be stored as a string as this.tpl.text.
     * @readonly
     */
    tpl: null,
    constructor: function (cfg) {
        this.id = 'cmp-' + Lui.Component.getNewId();
        this.set(cfg);
    },
    /**
     * Set configuration. Call this.refresh to re-render this component with the new config.
     */
    set: function (cfg) {
        this.cfg = this.cfg || {};
        $.extend(this, cfg);
    },
    /**
     * This method gets the template (that is within script tag with data-type=<type of component>)
     * parses it as HTML and stores it as this.tpl.dom and the original tpl as string as this.tpl.text.
     *
     * This template is used during render.
     *
     * A component can override this method and use whatever templating engine it wants (by default uses Lui.util.Template - i.e Htmilizer).
     *
     * Typically leaf-level components use this for rendering the view of the component with Htmilizer.
     * For higher level components, this template may use other components and so should be passed through
     * Lui.makeConfigFromViewImplementation to make use of them.
     */
    prepareTemplate: function () {
        if (!this.tpl) {
            var tpl = $('script[data-type="' + this.type + '"]')[0];
            if (tpl) {
                var text = tpl.firstChild.nodeValue.trim();
                this.tpl = new Lui.util.Template(text);
            }
        }
    },
    /**
     * Read a <component> element and return component config.
     * @param {HTMLElement} el Component's root element in the view.
     * @protected
     */
    makeConfigFromViewImplementation: function (element) {
        var cfg = {
            type: this.type,
            id: element.id || undefined,
            cls: element.className || undefined,
            style: element.getAttribute('style') || undefined,
            ref: element.getAttribute('ref') || undefined,
            html: element.innerHTML
        };
        return cfg;
    },
    /**
     * @returns {String} The html string to be used by {@link #render} method.
     * @protected
     */
    getCssClass: function () {
        var typeCls = this.type.toLowerCase().replace(/\./g, '-');
        return (typeCls + ' ' + this.cls).trim();
    },
    /**
     * @returns {DocumentFragment}
     * @protected
     */
    getOuterHtml: function () {
        var tpl = new Lui.util.Template('<div data-bind="attr: {id: id, data-type: type, class: cls, style: style}"></div>');
        return tpl.toDocumentFragment({
            id: this.id,
            type: this.type,
            cls: this.getCssClass() || '',
            style: this.style || ''
        });
    },
    /**
     * @returns {DocumentFragment|undefined}
     * Can be overridden by a derived class.
     * @protected
     */
    getInnerHtml: function () {
        //FIXME: Something is not right here.
        this.prepareTemplate();
        if (this.html) {
            return Li.dom(this.html);
        }
    },
    /**
     * @returns {DocumentFragment} The html markup of this component, to be used by {@link #render} method.
     * @protected
     */
    getHtml: function () {
        var outer = this.getOuterHtml(),
            inner = this.getInnerHtml();
        if (inner) {
            outer.firstChild.appendChild(inner);
        }
        return outer;
    },

    /**
     * @protected
     */
    renderOuter: function (target, childIndex) {
        this.prepareTemplate();
        target.insertBefore(this.getHtml(), target.childNodes[childIndex]);
        this.rootEl = $('#' + this.id, target)[0];
    },
    /**
     * Abstract method. To be used by derived classes like Box.
     * @protected
     */
    renderInner: $.noop,
    /**
     * Render component to target HTMLElement. Uses this.getHtml to render component.
     * @protected
     */
    render: function (target, childIndex) {
        this.unrender();
        this.prepareTemplate();
        this.renderOuter(target, childIndex);
        this.renderInner(target, childIndex);
        this.postRender(target);
        this.trigger('afterrender', this);
    },
    /**
     * Remove this component from document.
     * @protected
     */
    unrender: function () {
        /* If you call this method from blur event, then the removal of rootEl
         * could cause a second blur event to fire.
         * Hence store rootEl in temporary and set this.rootEl to null*/
        var rootEl = this.rootEl;
        this.rootEl = null;
        if (rootEl && rootEl.parentNode) {
            rootEl.parentNode.removeChild(rootEl);
        }
    },
    /**
     * Post render processing. Mainly attaching of listeners.
     * @protected
     */
    postRender: function (target) {
        this.initListeners(target);
    },
    /**
     * Rebinds listeners.
     */
    initListeners: function () {
        this.removeListeners();
        if (this.listeners) {
            if (!Li.isArray(this.listeners)) {
                this.listeners = [this.listeners];
            }
            var allListeners = this.listeners;
            this.listeners = [];
            allListeners.forEach(this.addListeners, this);
        }
    },
    /**
     * Adds listeners.
     */
    addListeners: function (listeners) {
        //Push to this.listeners
        this.listeners = this.listeners || [];
        if (!Li.isArray(this.listeners)) {
            this.listeners = [this.listeners];
        }
        this.listeners.push(listeners);

        //If rendered, then add dom listeners
        if (listeners.dom && this.rootEl) {
            var list = listeners.dom;
            Li.forEach(list, function bindAndAddListener(fn, event) {
                if (!fn._scoped_) {
                    fn = list[event] = Li.bind(fn, listeners.scope || this);
                    fn._scoped_ = true;
                }
                $(this.rootEl).on(event, fn);
            }, this);
        }
        Li.forEach(listeners, function (fn, event) {
            if (event !== 'dom' && event !== 'scope') {
                this.on(event, fn, listeners.scope || this);
            }
        }, this);
    },
    removeListeners: function () {
        if (this.listeners) {
            this.listeners.forEach(function (listeners) {
                if (listeners.dom && this.rootEl) {
                    Li.forEach(listeners.dom, function (fn, event) {
                        $(this.rootEl).off(event, fn);
                    }, this);
                }
                Li.forEach(listeners, function (fn, event) {
                    if (event !== 'dom' && event !== 'scope') {
                        this.off(event, fn);
                    }
                }, this);
            }, this);
        }
    },
    statics: {
        id: 1,
        getNewId: function () {
            return Lui.Component.id++;
        }
    }
});
