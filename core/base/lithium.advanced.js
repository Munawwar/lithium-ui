/**
 * Advanced utilities. Mainly used in Lithium UI.
 * @module advanced
 * @requires core
 * @title Lithium Advanced Utils.
 */
(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(['./lithium'], factory);
    } else if (typeof exports === 'object') { //For NodeJS
        module.exports = factory(require('./lithium'), require('jquery-node'));
    } else { //global
        factory(window.Li);
    }
}(function (Li) {

    Li.mix(Li, {
        /**
         * Given a DOM node, this method finds the next tag/node that would appear in the dom.
         * WARNING: Do not remove or add nodes while traversing, because it could cause the traversal logic to go crazy.
         * @param node Could be a any node (element node or text node)
         * @param ancestor Node An ancestorial element that can be used to limit the search.
         * The search algorithm, while traversing the ancestorial heirarcy, will not go past/above this element.
         * @param {function} callback A callback called on each element traversed.
         *
         * callback gets following parameters:
         * node: Current node being traversed.
         * isOpenTag: boolean. On true, node would be the next open tag/node that one would find when going
         * linearly downwards through the DOM. Filtering with isOpenTag=true, one would get exactly what native TreeWalker does.
         * Similarly isOpenTag=false when a close tag is encountered when traversing the DOM. AFAIK TreeWalker doesn't give this info.
         *
         * callback can return one of the following values (with their meanings):
         * 'halt': Stops immediately and returns null.
         * 'return': Halts and returns node.
         * 'continue': Skips further traversal of current node (i.e won't traverse it's child nodes).
         * 'break': Skips all sibling elements of current node and goes to it's parent node.
         *
         * relation: The relation compared to the previously traversed node.
         * @param {Object} [scope] Value of 'this' keyword within callback
         * @method traverse
         */
        traverse: function (node, ancestor, callback, scope) {
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
                } else {
                    if (isOpenTag) { // close open tag first
                        callback.call(scope, node, false, 'current');
                    }
                    if (node.nextSibling && node !== ancestor && ret !== 'break') {
                        node = node.nextSibling;
                        isOpenTag = true;
                        ret = callback.call(scope, node, true, 'nextSibling');
                    } else if (node.parentNode && node !== ancestor) {
                        //Traverse up the dom till you find an element with nextSibling
                        node = node.parentNode;
                        isOpenTag = false;
                        ret = callback.call(scope, node, false, 'parentNode');
                    } else {
                        node = null;
                    }
                }
            } while (node && ret !== 'return');
            return node || null;
        },

        /**
         * Parses string that could go into a tag's style attribute. Assumes valid CSS syntax.
         * Also assumes no duplicate CSS property.
         *
         * This handles semicolons, escaped characters and paranthesis that could be within a URI string.
         */
        parseStyleAttribute: function (str) {
            var css = {}, prop, val, pos, c, len, state = {};

            while (str) {
                pos = str.indexOf(':');
                prop = str.slice(0, pos).trim();
                str = str.slice(pos + 1);

                val = '';
                len = str.length;
                for (pos = 0; ; pos += 1) {
                    if (pos >= len) {
                        break;
                    }
                    c = str[pos];
                    //Handle URL bracket
                    if (c === '(' && !state.openBracket && !state.openQuote) {
                        state.openBracket = 1;
                    }
                    if (c === ')' && state.openBracket && !state.openQuote) {
                        delete state.openBracket;
                    }
                    //Handle quotes
                    if (c === "'" || c === '"') {
                        if (!state.openQuote) {
                            state[c] = 1;
                            state.openQuote = 1;
                        } else if (str[pos - 1] !== '\\') {
                            delete state[c];
                            delete state.openQuote;
                        }
                    }
                    //Stop on ;
                    if (c === ';' && !state.openQuote) {
                        break;
                    }
                    val += c;
                }
                val = val.trim();
                css [prop] = val;
                str = str.slice(pos + 1);
            }

            return css;
        }
    });

    return Li;
}));
