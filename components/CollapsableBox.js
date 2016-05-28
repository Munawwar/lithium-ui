/*global $,Li*/
define([
    '../core/Box',
    './libs',

    'tpl!./CollapsableBox.ko',
    'css!./CollapsableBox.css'
], function (Li, $) {
    /**
     * Class for Font selection dropdown.
     */
    Li.CollapsableBox = Li.extend('Li.CollapsableBox', Li.Box, {
        /**
         * Collapse button text
         */
        buttonText: Li.Observable('More'),

        constructor: function (cfg) {
            this.app = cfg.app;

            this.super(arguments);

            this.collapsePanel.style.height = '0px';
            this.collapsePanel.style.opacity = 0;
            this.on({
                collapseBtn: {
                    click: this.toggle
                },
                collapseCaret: {
                    click: this.toggle
                }
            });
        },

        toggle: function () {
            if (!this.inProgress) {
                if (this.collapsePanel.style.height === '0px') {
                    this.open();
                } else {
                    this.close();
                }
            }
        },

        open: function () {
            this.inProgress = true;
            $(this.collapsePanel).velocity('stop').velocity({height: this.collapsePanel.scrollHeight, opacity: 1}, {
                complete: function () {
                    this.collapsePanel.style.removeProperty('height');
                    this.inProgress = false;
                }.bind(this)
            });
        },

        close: function () {
            this.inProgress = true;
            $(this.collapsePanel).velocity('stop').velocity({height: 0, opacity: 0}, {
                complete: function () {
                    this.inProgress = false;
                }.bind(this)
            });
        }
    });

    return web;
});

