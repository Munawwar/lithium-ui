/*global describe, it*/

var assert = require("assert"),
    fs = require('fs'),
    path = require('path');

define([
    'core/Template.js',
    'core/Observable.js'
], function (Li) {

    describe('Observable: Test updates to text and attr binding', function () {
        var html = fetch('text-and-attr-binding-tpl.html'),
            template = new Li.Template(html),
            data = {
                btnText: Li.Observable('btntext'),
                titleText: Li.Observable('titleattr'),
                cls: Li.Observable('btn btn-default') //bootstrap 3 button css class
            },
            view = new Li.View(template, data),
            df = view.toDocumentFragment(data);

        //Do some ops on obervable
        it('it should have text = "btntext1"', function () {
            data.btnText('btntext1');
            assert.equal('btntext1', df.firstChild.textContent.trim());
        });
        it('it should also have class = "btn"', function () {
            data.cls('btn');
            assert.equal('btn', df.firstChild.className.trim());
        });
        it('it should also have title = "titleattr1"', function () {
            data.titleText('titleattr1');
            assert.equal('titleattr1', df.firstChild.getAttribute('title'));
        });
    });

    describe('Observable: Test updates to if binding', function () {
        var html = fetch('if-mixed-tpl.html'),
            template = new Li.Template(html),
            data = {
                opened: Li.Observable(false)
            },
            view = new Li.View(template, data),
            df = view.toDocumentFragment(data);

        //Do some ops on obervable
        it('it should have button when opened = true', function () {
            data.opened(true);
            assert.equal('BUTTON', df.firstChild.children[0].nodeName);
        });

        it('it shouldn\'t have button when opened = false', function () {
            data.opened(false);
            assert.equal(0, df.firstChild.children.length);
        });
    });

    ([
        'Observable: Test updates to foreach binding',
        'Observable: Test updates to container-less foreach binding'
    ]).forEach(function (testText, testNum) {
        describe(testText, function () {
            var html = fetch('foreach-' + (testNum + 1) + '-tpl.html'),
                template = new Li.Template(html),
                data = {
                    list: Li.ObservableArray([1, 2, 3, 4, 5])
                },
                view = new Li.View(template, data),
                df = view.toDocumentFragment(data);

            it('it should have 5 spans inside it', function () {
                assert.equal(5, df.firstChild.children.length);
            });

            it('it should have 4 spans inside it after a splice(2, 1)', function () {
                data.list.splice(2, 1);
                assert.equal(4, df.firstChild.children.length);
            });

            it('it should have 5 spans inside it after a splice(2, 0, 3)', function () {
                data.list.splice(2, 0, 3);
                assert.equal(5, df.firstChild.children.length);
            });

            it('it should have spans in reverse order after sort()ing in descending order', function () {
                data.list.sort(function (a, b) {
                    return b - a;
                });
                assert.equal('5', df.firstChild.children[0].textContent);
                assert.equal('4', df.firstChild.children[1].textContent);
                assert.equal('3', df.firstChild.children[2].textContent);
                assert.equal('2', df.firstChild.children[3].textContent);
                assert.equal('1', df.firstChild.children[4].textContent);
            });
        });
    });

    describe('Observable: Test diff-patch updates on foreach binding', function () {
        var html = fetch('foreach-3-tpl.html'),
            template = new Li.Template(html),
            data = {
                list: Li.ObservableArray([1, 2, 3, 4, 5])
            },
            view = new Li.View(template, data),
            df = view.toDocumentFragment(data);

        var firstEl = df.children[0],
            list = df.children[1];
        it('first span should have text as "5"', function () {
            assert.equal('5', firstEl.textContent);
        });

        it('div should have 4 spans inside it, with span 1 text as "2" and span 4 text as "5"', function () {
            assert.equal(4, list.children.length);
            assert.equal('2', list.children[0].textContent);
            assert.equal('5', list.children[3].textContent);
        });

        it('first span should have text as "6" inside it after a push(6)', function () {
            data.list.push(6);
            assert.equal('6', firstEl.textContent);
        });

        it('div should have 5 spans inside it after the previous push(6)', function () {
            assert.equal(5, list.children.length);
        });
    });
});

/*Utility functions*/
function fetch(pathToTextFile) {
    return fs.readFileSync(path.resolve(__dirname, pathToTextFile), {encoding: 'utf8'});
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
