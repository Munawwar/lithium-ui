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
     * Outer render template
     * @param {undefined|String|Lui.util.Template} tpl
     * if undefined, then script tag in document with data-outer="<component type>" is searched.
     *
     * If string, it used as selector to find the script tag.
     *
     * If instance of Lui.util.Template, then that is used directly.
     */
    outerTpl: undefined,
    /**
     * Inner render template
     * @param {undefined|String|Lui.util.Template|null} tpl
     * if undefined, then script tag in document with data-outer="<component type>" is searched.
     *
     * If string, it used as selector to find the script tag.
     *
     * If instance of Lui.util.Template, then that is used directly.
     *
     * If null, then no template. Some components don't have different "inner" and "outer", (eg component with a single void tag like <input>).
     */
    innerTpl: undefined,
    /**
     * CSS class to use on {@link #rootEl}.
     */
    cls: '',
    /**
     * Inline CSS style to apply on {@link #rootEl}.
     */
    style: '',
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
     * Read a <component> HTML element and generate corresponding component config.
     * @param {HTMLElement} el Component's root element in the static view implementation.
     * @protected
     */
    makeConfigFromView: function (element) {
        var cfg = {
            type: this.type,
            id: element.id || undefined,
            cls: element.className || undefined,
            style: element.getAttribute('style') || undefined,
            ref: element.getAttribute('ref') || undefined,
            innerTpl: element.innerHTML.trim() || undefined
        };
        if (cfg.innerTpl) {
            cfg.innerTpl = new Lui.util.Template(cfg.innerTpl);
        }
        return cfg;
    },
    /**
     * @returns {String} The CSS class to be used on rootEl by {@link #render} method.
     * @protected
     */
    getCssClass: function () {
        var typeCls = this.type.toLowerCase().replace(/\./g, '-');
        return (typeCls + ' ' + this.cls).trim();
    },
    /**
     * @returns {DocumentFragment}
     * To be used by {@link #renderOuter} method.
     * @protected
     */
    getOuterHtml: function () {
        return this.outerTpl.toDocumentFragment({
            id: this.id,
            type: this.type,
            cls: this.getCssClass() || '',
            style: this.style || ''
        });
    },
    /**
     * @returns {DocumentFragment|undefined}
     * To be used by {@link #renderInner} method.
     * Can be overridden by a derived class.
     * @protected
     */
    getInnerHtml: function () {
        if (this.innerTpl instanceof Lui.util.Template) {
            return this.innerTpl.toDocumentFragment({});
        }
    },
    /**
     * @protected
     */
    renderOuter: function (target, childIndex) {
        target.insertBefore(this.getOuterHtml(), target.childNodes[childIndex]);
        this.rootEl = $('#' + this.id, target)[0];
    },
    /**
     * @protected
     */
    renderInner: function () {
        if (this.rootEl) {
            var inner = this.getInnerHtml();
            if (inner) {
                $(this.rootEl).empty();
                this.rootEl.appendChild(inner);
            }
        }
    },
    /**
     * Render component to target HTMLElement.
     * @protected
     */
    render: function (target, childIndex) {
        this.unrender();
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
            //Temporarily remove from data structure and add them again.
            var allListeners = this.listeners;
            this.listeners = [];
            allListeners.forEach(this.addListeners, this);
        }
    },
    /**
     * Adds listeners.
     */
    //TODO: Add support for any ref: {}, listeners
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
