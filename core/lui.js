define([
    'jquery',
    './base/lithium.js'
], function ($, Li) {

    /**
     * Create the class using baseClass and proto paramters.
     *
     * If type is sent as parameter, class type will be registered with Li as a component
     * so that it can be used in HTML views with custom tags.
     * This automatically also adds the 'type' as a string to prototype of class (which Li.Component uses in rendered markup).
     * @param {String} [type] Unique name (including namespace) to be used for the new class. eg 'Li.Box'.
     * If this paramter isn't passed, then the new class to be created is not treated as a component.
     * @param {Function} baseClass
     * @param {Object} proto Prototype to use for creating the new class.
     */
    Li.extend = (function () {
        var oldFunc = Li.extend;
        return function (type, baseClass, protoObj) {
            if (arguments.length < 3) {
                return oldFunc.apply(Li, arguments);
            }

            //If three parameters are given then the class is to be treated as a component.
            protoObj.type = type;
            var typeLowerCase = type.toLowerCase(),
                classRef = oldFunc.call(Li, baseClass, protoObj);
            this.componentClasses[typeLowerCase] = classRef;

            var proto = classRef.prototype,
                P = function () {};
            P.prototype = proto;
            var inst = new P();

            //Find all observables from prototype and note them down in _observables.
            //A Component instance can use _observables to make it's own copy of these observables.
            proto._observables = [];
            for (var prop in inst) {
                if (Li.isObservable(inst[prop])) {
                    proto._observables.push(prop);
                }
            }

            if (Li.isFunction(inst.afterExtend)) {
                inst.afterExtend(proto);
            }
            return classRef;
        };
    }());

    Li.mix(Li, {
        uiVersion: '0.1.0',

        /**
         * Holds all classes inherited through Li.extend.
         * @private
         */
        componentClasses: {},

        /**
         * Get a class reference from list of registered classes.
         */
        getClass: function (type) {
            var classRef = this.componentClasses[type.toLowerCase()];
            if (!classRef) {
                throw new Error('Class does not exist');
            }
            return classRef;
        },

        /**
         * Finds template in script tag.
         * @private
         */
        findTemplate: function (attr, type, returnAsDocumentFragment) {
            var tpl = null,
                selector = 'script[' + attr + '="' + type + '"]',
                tplTag = document.querySelector(selector);
            if (tplTag) {
                var text = tplTag.firstChild.nodeValue.trim();
                if (returnAsDocumentFragment) {
                    tpl = Li.dom(text);
                } else {
                    tpl = new Li.Template(text);
                }
            }
            return tpl;
        },

        /**
         * Check if type is an observable.
         */
        isObservable: function (o) {
            return (Li.isFunction(o) && o.isLiObservable);
        },

        /**
         * Check if type is an observable.
         */
        isObservableArray: function (o) {
            return (Li.isFunction(o) && o.isLiObservableArray);
        },

        /**
         * Converts each property of object to an Observable
         */
        toObservable: function (obj) {
            Li.forEach(obj, function (val, key) {
                obj[key] = Li.Observable(val);
            });
            return obj;
        },

        /**
         * Get values from each property of ab object.
         * If property is an observable, then find it's primitive value.
         */
        fromObservable: function (obj) {
            if (!obj) {
                return obj;
            }
            var ret = {};
            Li.forEach(obj, function (val, key) {
                ret[key] = (Li.isObservable(val) ? val() : val);
            });
            return ret;
        }
    });

    //Utility functions.
    //TODO: I am placing it here since it is convenient. Maybe not the most appropriate place?
    Li.mix(Li, {
        /**
         * The utility helps in placing a position absolute element relative to another element's vertex/edge.
         *
         * Note:
         * 1. This will work only when target is positioned absolute within viewport.
         * 2. Also make sure element is "rendered" on browser for overflow calculations to work. i.e element should
         * be added to document, and one can set visibility=hidden or opacity=0, but display=none can't be used.
         *
         * @param {Object} [cfg] Config
         *
         * @param {HTMLElement} cfg.target The element to position.
         *
         * @param {HTMLElement} cfg.relTo An element which the target element's position should be relative to.
         *
         * @param {Array} cfg.anchor The point on the target element that should be aligned to relative element's anchor.
         * Possible values are [<start|center|end>, <start|center|end>], where first index indicates the X coordinate and the second indicates the Y coordinate
         *
         * @param {String} cfg.relAnchor The point on the relative element that the target element should be placed relative to.
         * Possible values are [<start|center|end>, <start|center|end>], where first index indicates the X coordinate and the second indicates the Y coordinate
         *
         * @param {Boolean} [cfg.allowOffscreen=false] Allow overflow respective to viewport. By default overflow isn't allowed, so
         * target is repositioned to fit within viewport.
         * @param {Boolean} [cfg.offscreenMargin=5] Margin from offsetParent from which target is considered to "off-screen".
         *
         * @param {Number} [cfg.displace=[0,0]] After all the internal calculation for anchoring is done, this displacement would be added.
         * This is useful for aesthetic reasons, like moving element slightly away from the 'top-left' of a relative element, for some margin etc.
         */
        position: (function () {
            /*
             * General function for finding an edge or corner point within a DOMRect. Useful for finding bottom edge's center etc.
             * @param {DOMRect} rect
             * @param {String} point 'start', 'center' or 'end'
             * @param {String} axis 'horz' or 'vert' axis.
             * point+axis tells what point to find..like 'start of horizontal edge' or 'center of vertical edge'.
             * @param {String} relativeTo
             * If relativeTo = 'document' returns edge/vertex point coordinate relative to document.
             * If relativeTo = 'itself' returns edge/vertex point coordinate relative to top-left coordinate of the passed DOMRect itself.
             */
            function rectPoint(rect, point, axis, relativeTo) {
                var horz = (axis === 'horz');
                if (relativeTo === 'document') {
                    switch (point) {
                    case 'start': return (horz ? rect.left : rect.top);
                    case 'center': return (horz ? (rect.left + rect.width / 2) : (rect.top + rect.height / 2));
                    case 'end': return (horz ? rect.right : rect.bottom);
                    }
                } else if (relativeTo === 'itself') {
                    switch (point) {
                    case 'start': return 0;
                    case 'center': return (horz ? (rect.width / 2) : (rect.height / 2));
                    case 'end': return (horz ? rect.width : rect.height);
                    }
                }
            }

            /* Ensures x or y coordinate doesn't overflow viewport. If element cannot be repositioned
             * in a way that would prevent overflow, then element's dimension is reduced.*/
            function overflowCorrection(el, pos, dim, margin) {
                var suffix = dim[0].toUpperCase() + dim.slice(1),
                    length = el['offset' + suffix],
                    viewportLength = window['inner' + suffix],

                    maxLength = length - (2 * margin),
                    isOverflow = [
                        (pos < margin),
                        (pos + length + margin > viewportLength)
                    ];
                if (maxLength > viewportLength) {
                    pos = margin;
                    $(el).css(dim, maxLength + 'px');
                } else if (isOverflow[0]) {
                    pos = margin;
                } else if (isOverflow[1]) {
                    pos = viewportLength - margin - length;
                }
                return pos;
            }

            return function (cfg) {
                var el = cfg.target,
                    relEl = cfg.relTo,
                    anchor = cfg.anchor,
                    relAnchor = cfg.relAnchor,
                    displace = cfg.displace || [0, 0],
                    allowOffscreen = Li.isBoolean(cfg.allowOffscreen) ? cfg.allowOffscreen : false,
                    offscreenMargin = Li.isNumber(cfg.offscreenMargin) ? cfg.offscreenMargin : 5,

                    elRect = el.getBoundingClientRect(),
                    relRect = relEl.getBoundingClientRect(),

                    relElLeft = rectPoint(relRect, relAnchor[0], 'horz', 'document'),
                    relElTop = rectPoint(relRect, relAnchor[1], 'vert', 'document'),
                    elAnchorLeft = rectPoint(elRect, anchor[0], 'horz', 'itself'),
                    elAnchorTop = rectPoint(elRect, anchor[1], 'vert', 'itself'),

                    left = relElLeft - elAnchorLeft + displace[0],
                    top = relElTop - elAnchorTop + displace[1];

                //Check overflow
                if (!allowOffscreen && Li.isDisplayed(el)) {
                    left = overflowCorrection(el, left, 'width', offscreenMargin);
                    top = overflowCorrection(el, top, 'height', offscreenMargin);
                }

                $(el).css({
                    left: left,
                    top: top
                });
            };
        }()),

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
                css[prop] = val;
                str = str.slice(pos + 1);
            }

            return css;
        }
    });

    return Li;
});
