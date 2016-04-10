define([
    'jquery',
    '../core/Box',

    'tpl!./Modal.ko',
    'css!./Modal.css'
], function ($, Li) {
    /**
     * Base class for Window.
     */
    Li.Modal = Li.extend('Li.Modal', Li.Box, {
        cls: 'modal', //materializecss CSS class
        /**
         * Footer template
         * @type {Li.Template|DocumentFragment}
         */
        footerTpl: null,

        /**
         * Can window be closed by user?
         */
        dismissible: true,

        /**
         * Show an overlay behind window or not. Default behavior is to show.
         */
        modaless: false,

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

        show: function () {
            //Following adapted from materializecss
            var $overlay = Li.Modal.overlay,
                $modal = $(this.el),
                stack = Li.Modal.stack;

            if (!this.modaless && !document.body.contains($overlay[0])) {
                $("body").append($overlay);
            }
            stack.push(this);
            $modal.css('z-index', 1000 + stack.length);

            if (this.dismissible && stack.length === 1) {
                // Return on click of overlay
                Li.on(document, 'click', this.onClickDocument);
                // Return on ESC
                Li.on(document, 'keyup', this.onKeyUpDocument);
            }

            if (!this.modaless) {
                $overlay.css({display: "block", opacity: 0.5});
            }
            $modal.css({display: "block", top: '10%'});

            if (!document.body.contains(this.el)) {
                this.render(document.body);
            }
        },

        hide: function () {
            var $overlay = Li.Modal.overlay,
                $modal = $(this.el),
                stack = Li.Modal.stack;

            if (stack[stack.length - 1] === this) {
                stack.pop();
            }
            if (!stack.length) {
                Li.off(document, 'click', this.onClickDocument);
                Li.off(document, 'keyup', this.onKeyUpDocument);
            }

            if (!this.modaless) {
                $overlay[0].style.removeProperty('display');
            }
            $modal[0].style.removeProperty('display');
        },

        onClickDocument: function (e) {
            var stack = Li.Modal.stack;
            if (stack.length) {
                var lastModal = stack[stack.length - 1];
                //Only consider clicks outside of the Modal.
                if (lastModal.el.contains(e.target)) {
                    return;
                }
                lastModal.hide();
                lastModal.trigger('clickclosed', e);
            }
        },

        onKeyUpDocument: function (e) {
            if (e.keyCode === 27) { // ESC key
                var stack = Li.Modal.stack;
                if (stack.length) {
                    var lastModal = stack[stack.length - 1];
                    //Only consider ESC outside of the Modal.
                    if (lastModal.el.contains(e.target)) {
                        return;
                    }
                    lastModal.hide();
                    lastModal.trigger('escapeclosed', e);
                }
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
            overlay: $('<div class="lean-overlay"></div>'),

            /**
             * Singleton cache
             */
            singletonCache: {},
            /**
             * Static method to manage singletons
             */
            singleton: function (cfg) {
                if (!cfg.type || cfg.type === 'Li.Modal') {
                    throw new Error('Window Type is needed. And it should be a derived class of Li.Modal.');
                }
                var ns = Li.Modal,
                    show = cfg.show;
                delete cfg.show;
                var instance = ns.singletonCache[cfg.type];
                if (!instance) {
                    var Class = Li.getClass(cfg.type);
                    instance = new Class(cfg);
                    ns.singletonCache[cfg.type] = instance;
                } else {
                    instance.set(cfg);
                }

                if (show) {
                    instance.show();
                } else {
                    instance.hide();
                }

                return instance;
            }
        }
    });

    return Li;
});
