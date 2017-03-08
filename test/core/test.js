/* global System */
var assert = require("assert"),
    utils = require('../utils');

var Li;

before(function () {
    return System.import('core/Box.js')
        .then (function (LiRef) {
            Li = LiRef;
        });
});

describe('Component: Test Box component', function () {

    var box, df, el;
    before(function () {
        box = new Li.Box({});
        df = document.createDocumentFragment();
        box.attach(df);

        el = box.el;
    });

    it('should have root element', function () {
        assert.equal(el, df.firstChild);
    });

    it('test component markup', function () {
        //Remove text nodes
        if (el.firstChild.nodeType === 3) {
            el.normalize();
            el.removeChild(el.firstChild);
        }
        assert.equal(utils.toHTML(df), '<div id="cmp-1" data-type="li-box" class="li-box"></div>');
    });
});

describe('Component: Test usage of custom elements in templates', function () {
    var cmp, df, el;
    before(function () {
        var MyComp = Li.component('my-comp', {
            innerTpl: new Li.Template(
                '<li-box ref="innercomp" class="round-box" style="color: red;"></li-box>' +
                '<li-box config="style: \'color: red;\'"></li-box>'
            )
        });
        cmp = new MyComp({});
        df = document.createDocumentFragment();
        cmp.attach(df);

        el = cmp.el;
    });

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
