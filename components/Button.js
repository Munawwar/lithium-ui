define(['./libs', '../core/Component', '../core/Observable', 'tpl!./Button.ko'], function ($, Li) {

    /**
     * Button.
     */
    Li.Button = Li.extend('Li.Button', Li.Component, {
        cls: Li.Observable('waves-effect waves-light'),
        /**
         * Text to display on button
         */
        text: Li.Observable('Button'),
        /**
         * Disabled when true.
         */
        disabled: Li.Observable(false),

        set: function (cfg) {
            if (cfg.cls && cfg.cls.split(' ').indexOf('fixed-action-btn') > -1)  {
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

        /**
         * @override
         */
        makeConfigFromView: function (target) {
            var cfg = this.super(arguments);
            cfg.text = (target.firstChild || {}).nodeValue;
            cfg.disabled = target.hasAttribute('disabled');
            return cfg;
        },

        enable: function () {
            this.disabled(false);
        },

        disable: function () {
            this.disabled(true);
        },

        openFABMenu: function () {
            $this = $(this.el);
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
            $this = $(this.el);
            $this.removeClass('active');
            var time = 0;
            $this.find('ul .btn-floating').velocity("stop", true);
            $this.find('ul .btn-floating').velocity(
                { opacity: "0", scaleX: ".4", scaleY: ".4", translateY: "40px"},
                { duration: 80 }
            );
        }
    });

    return Li;
});
