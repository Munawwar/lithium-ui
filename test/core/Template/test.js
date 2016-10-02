/*global describe, it*/

var assert = require("assert"),
    fs = require('fs'),
    path = require('path');

define(['core/View.js'], function (Li) {
    var Htmlizer = Li.Template;

    describe('Template: Test text and attr binding', function () {
        var html = fetch('text-and-attr-binding-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                btnText: 'Click here',
                titleText: 'abc " def',
                cls: 'btn btn-default' //bootstrap 3 button css class
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have text = "Click here"', function () {
            assert.equal('Click here', df.firstChild.textContent.trim());
        });
        it('it should also have class = "btn btn-default"', function () {
            assert.equal('btn btn-default', df.firstChild.className.trim());
        });
        it('it should also have title = "abc &quot; def"', function () {
            assert.equal('abc " def', df.firstChild.getAttribute('title'));
        });
    });

    describe('Template: Test container-less text binding', function () {
        var html = fetch('text-comment-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                btnText: 'Click here'
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('button element should have 3 child nodes', function () {
            assert.equal(3, df.firstChild.childNodes.length);
        });
        it('and it should be a text node with text = "Click here"', function () {
            assert.equal('Click here', df.firstChild.textContent.trim());
        });
    });

    describe('Template: Test html binding', function () {
        var html = fetch('html-binding-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                message: '<b>This</b> is a <b>serious message</b>.'
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 3 HTMLElements', function () {
            assert.equal(3, countElements(df));
        });
    });

    describe('Template: Test inline "if" binding', function () {
        var html = fetch('if-inline-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                btnText: 'Howdy!',
                cls: 'btn btn-default' //bootstrap 3 button css class
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 2 HTMLElements', function () {
            assert.equal(2, countElements(df));
        });
    });

    describe('Template: Test container-less nested "if" binding', function () {
        var html = fetch('if-comment-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                btnText: 'Howdy!',
                cls: 'btn btn-default' //bootstrap 3 button css class
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 3 HTMLElements', function () {
            assert.equal(3, countElements(df));
        });
        it('button element should have text in it', function () {
            assert.equal('Howdy!', df.querySelector('.btn').firstChild.nodeValue);
        });
    });

    describe('Template: Test mixed "if" binding', function () {
        var html = fetch('if-mixed-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                btnText: 'Howdy!',
                cls: 'btn btn-default' //bootstrap 3 button css class
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 1 HTMLElement', function () {
            assert.equal(1, countElements(df));
        });
    });

    describe('Template: Test inline "foreach" binding', function () {
        var html = fetch('foreach-inline-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                items: ['item1', 'item2', 'item3']
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 4 HTMLElements', function () {
            assert.equal(4, countElements(df));
        });
    });

    describe('Template: Test container-less "foreach" binding', function () {
        var html = fetch('foreach-comment-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                items: [{
                    name: 'item1',
                    subItems: [{
                        name: 'subitem1'
                    }, {
                        name: 'subitem2'
                    }]
                }, {
                    name: 'item2'
                }, {
                    name: 'item3'
                }]
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 6 HTMLElements', function () {
            assert.equal(6, countElements(df));
        });
    });

    describe('Template: Test css and style binding', function () {
        var html = fetch('css-and-style-binding-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                isWarning: true,
                bold: false
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have class="warning"', function () {
            assert.equal('warning', df.firstChild.className.trim());
        });
        it('it should have style="font-weight: normal"', function () {
            assert.equal('normal', df.firstChild.style.fontWeight);
        });
    });

    describe('Template: Test binding contexts', function () {
        var html = fetch('binding-context-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                items: [{
                    name: 'item1',
                    subItems: [{
                        name: 'subitem1'
                    }]
                }]
            }),
            df = htmlToDocumentFragment(outputHtml);

        var count = 0;
        traverse(df, df, function (node, isOpenTag) {
            if (isOpenTag && node.nodeType === 1 && node.nodeName === 'SPAN') {
                count += 1;
                if (count === 1) {
                    it('span 1 text should be "SPAN"', function () {
                        assert.equal('SPAN', node.textContent);
                    });
                }
                if (count >= 2 && count <= 3) {
                    it('span ' + count + ' text should be "item1"', function () {
                        assert.equal('item1', node.textContent);
                    });
                }
                if (count === 4) {
                    it('span 4 text should be "0"', function () {
                        assert.equal('0', node.textContent);
                    });
                }
                if (count >= 5 && count <= 6) {
                    it('span ' + count + ' text should be "subitem1"', function () {
                        assert.equal('subitem1', node.textContent);
                    });
                }
                if (count === 7) {
                    it('span 6 text should be "true"', function () {
                        assert.equal('true', node.textContent);
                    });
                }
            }
        });
    });

    describe('Template: Test "ifnot" binding', function () {
        var html = fetch('ifnot-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                btnText: 'Howdy!',
                cls: 'btn btn-default' //bootstrap 3 button css class
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 1 HTMLElements', function () {
            assert.equal(1, countElements(df));
        });
    });

    describe('Template: Test inline "with" binding', function () {
        var html = fetch('with-inline-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                obj: {
                    val: 10
                }
            }),
            df = htmlToDocumentFragment(outputHtml);
        var count = 0;
        traverse(df, df, function (node, isOpenTag) {
            if (isOpenTag && node.nodeType === 1 && node.nodeName === 'SPAN' &&
                node.textContent === "10") {
                count += 1;
            }
        });
        it('it should have 4 SPANs with "10" as text content', function () {
            assert.equal(4, count);
        });
    });

    describe('Template: Test container-less "with" binding', function () {
        var html = fetch('with-comment-tpl.html'),
            outputHtml = (new Htmlizer(html)).toString({
                obj: {
                    val: 10
                }
            }),
            df = htmlToDocumentFragment(outputHtml);
        var count = 0;
        traverse(df, df, function (node, isOpenTag) {
            if (isOpenTag && node.nodeType === 1 && node.nodeName === 'SPAN' &&
                node.textContent === "10") {
                count += 1;
            }
        });
        it('it should have 4 SPANs with "10" as text content', function () {
            assert.equal(4, count);
        });
    });

    describe('Template: Test no conflict option', function () {
        var html = fetch('noconflict-tpl.html'),
            outputHtml = (new Htmlizer(html, {noConflict: true})).toString({
                btnText: 'Howdy!',
                cls: 'btn btn-default' //bootstrap 3 button css class
            }),
            df = htmlToDocumentFragment(outputHtml);

        var btnCount = 0, firstBtnHasNoDataHtmlizer = true, secondBtnHasDataBind = true;
        traverse(df, df, function (node, isOpenTag) {
            if (isOpenTag && node.nodeType === 1 && node.nodeName === "BUTTON") {
                btnCount += 1;
                if (btnCount === 1 && node.getAttribute('data-htmlizer')) {
                    firstBtnHasNoDataHtmlizer = false;
                }
                if (btnCount === 2 && !node.getAttribute('data-bind')) {
                    secondBtnHasDataBind = false;
                }
            }
        });

        it('it should have 2 buttons', function () {
            assert.equal(2, btnCount);
        });
        it('of which first button shouldn\'t have data-htmlizer attribute', function () {
            assert.equal(true, firstBtnHasNoDataHtmlizer);
        });
        it('and second button should have data-bind attribute', function () {
            assert.equal(true, secondBtnHasDataBind);
        });
    });

    describe('Template: Test no conflict with sub-template', function () {
        var html = fetch('noconflict-subtemplate-tpl.html'),
            outputHtml = (new Htmlizer(html, {noConflict: true})).toString({
                items: [{
                    name: 'item1',
                    subItems: [{
                        name: 'subitem1'
                    }, {
                        name: 'subitem2'
                    }]
                }, {
                    name: 'item2'
                }, {
                    name: 'item3'
                }]
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('it should have 6 HTMLElements', function () {
            assert.equal(6, countElements(df));
        });
    });

    describe('Template: Test template binding', function () {
        var html = fetch('template.html'),
            subtplhtml = fetch('files/subtemplate.html'),
            outputHtml = (new Htmlizer(html)).toString({
                name: 'Franklin',
                credits: 250,
                subtpl: new Htmlizer(subtplhtml)
            }),
            df = htmlToDocumentFragment(outputHtml);
        it('div should have h3 tag', function () {
            assert.equal('H3', df.firstChild.childNodes[1].tagName);
        });
        it('h3 should have text as "Franklin"', function () {
            assert.equal('Franklin', df.firstChild.childNodes[1].firstChild.nodeValue);
        });
    });

    return '42';
});

/*Utility functions*/
function fetch(pathToTextFile) {
    return fs.readFileSync(path.resolve(__dirname, pathToTextFile), {encoding: 'utf8'});
}

function htmlToDocumentFragment(html) {
    var df = document.createDocumentFragment();
    jQuery.parseHTML(html).forEach(function (node) {
        df.appendChild(node);
    }, this);
    return df;
}

/**
 * @param {DocumentFragment} df
 */
function countElements(df) {
    return df.querySelectorAll('*').length;
}

function traverse(node, ancestor, callback, scope) {
    //if node = ancestor, we still can traverse it's child nodes
    if (!node) {
        return null;
    }
    var isOpenTag = true, ret = null;
    do {
        if (ret === 'halt') {
            return null;
        }
        if (isOpenTag && node.firstChild && !ret) {
            node = node.firstChild;
            //isOpenTag = true;
            ret = callback.call(scope, node, true, 'firstChild');
        } else if (node.nextSibling && node !== ancestor && ret !== 'break') {
            if (isOpenTag) {
                callback.call(scope, node, false, 'current');
            }
            node = node.nextSibling;
            isOpenTag = true;
            ret = callback.call(scope, node, true, 'nextSibling');
        } else if (node.parentNode && node !== ancestor) {
            if (isOpenTag) {
                callback.call(scope, node, false, 'current');
            }
            //Traverse up the dom till you find an element with nextSibling
            node = node.parentNode;
            isOpenTag = false;
            ret = callback.call(scope, node, false, 'parentNode');
        } else {
            node = null;
        }
    } while (node && ret !== 'return');
    return node || null;
}
