/*global describe, it*/

var assert = require("assert"),
    fs = require('fs'),
    path = require('path');

define([
    'core/Template.js',
    'core/Observable.js'
], function (Li) {

    describe('Observable: Test text and attr binding updates', function () {
        var html = fetch('text-and-attr-binding-tpl.html'),
            template = new Li.Template(html),
            data = {
                btnText: Li.Observable('btntext'),
                titleText: Li.Observable('titleattr'),
                cls: Li.Observable('btn btn-default') //bootstrap 3 button css class
            },
            view = new Li.Template.View(template, data),
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

    describe('Observable: Test if binding updates', function () {
        var html = fetch('if-mixed-tpl.html'),
            template = new Li.Template(html),
            data = {
                opened: Li.Observable(false)
            },
            view = new Li.Template.View(template, data),
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
