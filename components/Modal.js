define([
    'jquery',
    './Popover.js',

    './Modal.ko!tpl',
    './Modal.css!css'
], function ($, Li) {
    /**
     * Base class for Window.
     */
    Li.Modal = Li.extend('Li.Modal', Li.Popover, {
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
                innerTpl: innerTpl ? innerTpl.innerHTML.trim() : undefined,
                footerTpl: footerEl ? footerEl.innerHTML.trim() : undefined
            });
            if (cfg.innerTpl) {
                cfg.innerTpl = new Li.Template(cfg.innerTpl);
            }
            if (cfg.footerEl) {
                cfg.footerTpl = new Li.Template(cfg.footerEl);
            }

            return cfg;
        },

        afterExtend: function (proto) {
            this.super(arguments);

            if (proto === Li.getClass('Li.Component').prototype || (proto instanceof Li.Component)) {
                var prefix = proto.type.toLowerCase().replace(/\./, '-'),
                    tpl = Li.findTemplate('id', prefix + '-header');
                tpl = Li.findTemplate('id', prefix + '-footer');
                if (tpl) {
                    proto.footerTpl = tpl;
                }
            }
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

            //Hide overlay only after the last Modal has been closed.
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
             * Properties to manage z-index
             */
            stack: [],

            /**
             * Overlay element
             */
            overlay: $('<div class="lean-overlay"></div>')
        }
    });

    return Li;
});
