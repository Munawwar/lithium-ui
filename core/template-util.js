/*global console*/
/*jslint evil: true*/

(function (factory, saferEval) {
    define([
        'jquery',
        './lui.js',
        './util/js-object-literal-parse.js'
    ], function ($, Li, parseObjectLiteral) {
        return factory.call(this, saferEval, $, Li, parseObjectLiteral);
    }.bind(this));
}(function (saferEval, $, Li, parseObjectLiteral) {
    var util = {
        saferEval: saferEval,

        regex: {
            //hz is Htmlizer prefix which is supported by AssetGraph-builder
            commentStatment: /(?:ko|hz)[ ]+([^:]+):(.+)/
        },
        /**
         * Parse html string using jQuery.parseHTML and also make sure script tags aren't removed.
         * @param {String} html
         * @private
         */
        parseHTML: function (html) {
            return $.parseHTML(html, document, true);
        },

        /**
         * @private
         * @param {Array[Node]} nodes
         */
        moveToFragment: function (nodes, fragment) {
            fragment = fragment || document.createDocumentFragment();
            nodes.forEach(function (n) {
                fragment.appendChild(n);
            });
            return fragment;
        },

        /**
         * @private
         */
        parseObjectLiteral: function (objectLiteral) {
            var obj = {},
                tuples = parseObjectLiteral(objectLiteral);
            tuples.forEach(function (tuple) {
                var str = tuple[1].trim();
                if (str[0] === '{') { //if object then parse it as well.
                    var subObj = this.parseObjectLiteral(tuple[1].slice(1, -1));
                    if (Li.isObject(obj[tuple[0]])) { //deep merge multiple declarations
                        $.extend(true, obj[tuple[0]], subObj);
                    } else {
                        if (obj[tuple[0]]) {
                            console.warn('Overwriting');
                        }
                        obj[tuple[0]] = subObj;
                    }
                } else {
                    obj[tuple[0]] = tuple[1];
                }
            }, this);
            return obj;
        },

        /**
         * Returns a reference to the constructor of a Class using a node (name).
         * @param {HTMLElement} node
         */
        getClassFromNode: function (node) {
            var classRef = null;
            //Check for at least one hyphen.
            if (node.nodeType === 1 && node.nodeName.includes('-')) {
                classRef = Li.getClass(node.nodeName.replace(/-/g, '.'));
            }
            return classRef;
        },

        /**
         * Will stop iterating if callback returns true.
         * @private
         */
        forEachObjectLiteral: function (objectLiteral, callback, scope) {
            var obj = objectLiteral;
            if (typeof objectLiteral === 'string') {
                obj = this.parseObjectLiteral(objectLiteral);
            }
            if (obj) {
                Object.keys(obj).some(function (key) {
                    return (callback.call(scope, key, obj[key]) === true);
                });
            }
        },

        /**
         * @private
         * Get all immediate nodes between two given nodes.
         * @param {Boolean} inclusive Also include startNode and endNode in the returned array.
         */
        getImmediateNodes: function (frag, startNode, endNode, inclusive) {
            var nodes = [];
            if (inclusive) {
                nodes.push(startNode);
            }
            if (startNode === endNode) {
                return nodes;
            }
            Li.traverse(startNode, frag, function (node, isOpenTag) {
                if (isOpenTag) {
                    if (inclusive && node.parentNode === startNode) {
                        return 'break';
                    }
                    if (node === endNode) {
                        return 'halt';
                    }
                    nodes.push(node);
                    return 'continue';
                }
            });
            if (inclusive) {
                nodes.push(endNode);
            }
            return nodes;
        },

        /**
         * @private
         */
        findBlockFromStartNode: function (blocks, node) {
            return blocks.filter(function (block) {
                return block.start === node;
            })[0] || null;
        }
    };

    return util;
}, function () {
    //Templates could be attempting to reference undefined variables. Hence try catch is required.
    if (arguments.length === 3) {
        var evaluator;
        if (!(evaluator = this.exprEvaluatorCache[arguments[0]])) {
            evaluator = this.exprEvaluatorCache[arguments[0]] = new Function('$context', '$element', 'with($context){with($data){return ' + arguments[0] + '}}');
        }
        try {
            return evaluator(arguments[1], arguments[2]);
        } catch (e) {
            console.warn('Warning: ' + e.stack);
        }
    } else {
        throw new Error('Expression evaluator needs at least 3 arguments.');
    }
}));
