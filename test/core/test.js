var assert = require("assert"),
    fs = require('fs'),
    path = require('path'),
    utils = require('../utils');

requirejs(['core/Box'], function (Li) {
    describe('box component test', function () {
        var box = new Li.Box({}),
            df = document.createDocumentFragment();
        box.render(df);

        //Remove text nodes
        var el = box.el;
        it('should have root element', function () {
            assert.equal(el, df.firstChild);
        });

        it('test component markup', function () {
            if (el.firstChild.nodeType === 3) {
                el.normalize();
                el.removeChild(el.firstChild);
            }
            assert.equal(utils.toHTML(df), '<div id="cmp-1" data-type="Li.Box" class="li-box"></div>');
        });
    });
});
