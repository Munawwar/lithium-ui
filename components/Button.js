define([
    './libs.js',
    '../core/Component.js',
    '../core/Observable.js',
    './Button.ko!tpl'
], function ($, Li) {

    /**
     * Button.
     */
    Li.Button = Li.extend('Li.Button', Li.Component, {
        /**
         * Text to display on button
         */
        text: Li.Observable(''),
        /**
         * Disabled when true.
         */
        disabled: Li.Observable(false),
        /**
         * Sets 'toggled' CSS class
         */
        toggled: Li.Observable(false),

        /**
         * @override
         */
        makeConfigFromView: function (target, cfg) {
            cfg = this.super(arguments);
            if (cfg.text === undefined) {
                cfg.text = (target.firstChild || {}).nodeValue;
            }
            if (cfg.disabled === undefined) {
                cfg.disabled = target.hasAttribute('disabled');
            }
            return cfg;
        },

        set: function (cfg) {
            if (cfg.addClass && cfg.addClass.split(' ').indexOf('fixed-action-btn') > -1)  {
                this.on({
                    'mouseenter': this.openFABMenu,
                    'mouseleave': this.closeFABMenu
                });
            } else {
                this.off({
                    'mouseenter': this.openFABMenu,
                    'mouseleave': this.closeFABMenu
                });
            }

            this.super([cfg]);
        },

        enable: function () {
            this.disabled(false);
        },

        disable: function () {
            this.disabled(true);
        },

        openFABMenu: function () {
            var $this = $(this.el);
            if ($this.hasClass('active') === false) {
                $this.addClass('active');
                $this.find('ul .btn-floating').velocity(
                    { scaleY: ".4", scaleX: ".4", translateY: "40px"},
                    { duration: 0 });

                var time = 0;
                $this.find('ul .btn-floating').reverse().each(function () {
                    $(this).velocity(
                        { opacity: "1", scaleX: "1", scaleY: "1", translateY: "0"},
                        { duration: 80, delay: time });
                    time += 40;
                });
            }
        },

        closeFABMenu: function () {
            var $this = $(this.el);
            $this.removeClass('active');
            $this.find('ul .btn-floating').velocity("stop", true);
            $this.find('ul .btn-floating').velocity(
                { opacity: "0", scaleX: ".4", scaleY: ".4", translateY: "40px"},
                { duration: 80 }
            );
        },

        attach: function () {
            this.super(arguments);

            var bgColor = window.getComputedStyle(this.el).backgroundColor,
                sRGB = (bgColor === 'transparent' ? 'rgb(255,255,255)' : bgColor).slice(4, -1).replace(/ /g, '').split(',');
            sRGB.forEach(function (v, i) {
                sRGB[i] = parseInt(v, 10) / 255;
            });
            this.predictLightness(sRGB);
        },

        predictLightness: (function () {
            /* Convert sRGB component to RGB component.
             * Taken from http://stackoverflow.com/a/13558570.
             *
             * aka inverse gamma. Some call it "inverse sRGB companding".
             * All the constants are taken from sRGB spec.
             * Read about it at http://en.wikipedia.org/wiki/SRGB (I didn't understand how they derived the approximation).
             * @param {Number} c A fraction between 0 and 1.
             */
            function linear(c) {
                if (c <= 0.04045) {
                    return c / 12.92;
                } else {
                    return Math.pow((c + 0.055) / 1.055, 2.4);
                }
            }

            //sRGB to RGB (linear)
            function toRGB (sRGB) {
                return [
                    linear(sRGB[0]),
                    linear(sRGB[1]),
                    linear(sRGB[2])
                ];
            }

            return function (sRGB) {
                var rgb = toRGB(sRGB),
                    luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]; //the Y part of YIQ or YUV
                this.set({
                    addClass: 'waves-' + (luminance <= 0.5 ? 'light' : 'dark'),
                    removeClass: 'waves-' + (luminance <= 0.5 ? 'dark' : 'light')
                });
            };
        }())
    });

    return Li;
});
