var assert = require("assert"),
    fs = require('fs'),
    path = require('path'),
    utils = require('../utils');

define(['core/Box.js'], function (Li) {
    describe('Component: Test Box component', function () {
        var box = new Li.Box({}),
            df = document.createDocumentFragment();
        box.attach(df);

        var el = box.el;
        it('should have root element', function () {
            assert.equal(el, df.firstChild);
        });

        it('test component markup', function () {
            //Remove text nodes
            if (el.firstChild.nodeType === 3) {
                el.normalize();
                el.removeChild(el.firstChild);
            }
            assert.equal(utils.toHTML(df), '<div id="cmp-1" data-type="Li.Box" class="li-box"></div>');
        });
    });

    var MyComp = Li.extend('MyComp', Li.Box, {
        innerTpl: new Li.Template(
            '<li-box ref="innercomp" class="round-box" style="color: red;"></li-box>' +
            '<li-box config="style: \'color: red;\'"></li-box>'
        )
    });
    describe('Component: Test usage of custom elements in templates', function () {
        var cmp = new MyComp({}),
            df = document.createDocumentFragment();
        cmp.attach(df);

        var el = cmp.el;
        it('it should have added to the document fragment', function () {
            assert.equal(el.children[0].nodeName, 'DIV');
        });
        it('class attribute test', function () {
            assert.equal(el.children[0].classList[1], 'round-box');
        });
        it('style attribute test', function () {
            assert.equal(el.children[0].style.color, 'red');
        });
        it('ref attribute test', function () {
            assert.equal(true, (cmp.innercomp instanceof Li.Box) && cmp.innercomp.el === el.children[0]);
        });
        it('config attribute test', function () {
            assert.equal(el.children[1].style.color, 'red');
        });
    });
});
