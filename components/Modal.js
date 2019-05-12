var $ = require('jquery');
var Li = require('./Popover.js');

var outerTpl = require('./Modal-outer.ko');
require('./Modal.css');

/**
 * Base class for Window.
 */
Li.Modal = Li.component('li-modal', Li.Popover, {
    outerTpl: outerTpl,
    
    /**
     * Footer template
     * @type {Li.Template|DocumentFragment}
     */
    footerTpl: null,

    //Note: afterExtend() and makeConfigFromView() cannot be static methods since they are taken from the prototype chain.
    makeConfigFromView: function (element, cfg) {
        cfg = Li.Modal.super.makeConfigFromView.apply(this, arguments);

        var innerTpl = element.querySelector('li-body'),
            footerEl = element.querySelector('li-footer');

        $.extend(cfg, {
            innerTpl: innerTpl ? (innerTpl.innerHTML.trim() || undefined) : undefined,
            footerTpl: footerEl ? (footerEl.innerHTML.trim() || undefined) : undefined
        });
        if (typeof cfg.innerTpl === 'string') {
            cfg.innerTpl = new Li.Template(cfg.innerTpl);
        }
        if (typeof cfg.footerTpl === 'string') {
            cfg.footerTpl = new Li.Template(cfg.footerTpl);
        }

        return cfg;
    },

    afterExtend: function (proto) {
        this.super(arguments);

        if (proto === Li.getClass('li-modal').prototype || (proto instanceof Li.Modal)) {
            if (typeof proto.footerTpl === 'string') {
                proto.footerTpl = new Li.Template(proto.footerTpl);
            }
        }
    },

    initializeView: function () {
        if (typeof this.footerTpl === 'string') {
            this.footerTpl = new Li.Template(this.footerTpl);
        }
        this.super(arguments);
    },

    /**
     * @override
     */
    show: function (e) {
        //Following adapted from materializecss
        var $overlay = Li.Modal.overlay,
            $modal = $(this.el);

        if (!document.body.contains($overlay[0])) {
            $("body").append($overlay);
        }
        $overlay.css({display: "block", opacity: 0.5});
        $modal.css({top: '10%'});

        this.super([e]);
    },

    hide: function () {
        this.super(arguments);

        // Hide overlay only after the last Modal has been closed.
        var $overlay = Li.Modal.overlay,
            stack = Li.Popover.stack,
            hasModal = stack.some(function (info) {
                return (info.component instanceof Li.Modal);
            });
        if (!hasModal) {
            $overlay[0].style.removeProperty('display');
        }
    },

    statics: {
        /**
         * Overlay element
         */
        overlay: $('<div class="lean-overlay"></div>'),

        // Alias to Li.Popover.Singleton
        singleton: Li.Popover.singleton
    }
});

module.exports = Li;
