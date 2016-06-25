/**
 * Flexbox's flex is broken on Chrome 49 (or even before that).
 * Non-flex items do not respect minimum content height when a flex item is around.
 * flex: 1 0 auto; was suggested as workaround, but that makes the flexed item to not have scrollbar (on overflow:scroll).
 *
 * This JS computes and sets height for flex items within 'vbox'es.
 */
define(['../base/lithium.js'], function (Li) {

    var module = {
        elMap: {},

        flexRecalc: (function () {
            //Private common vars and functions
            var canIgnoreCalc = function (el, ignoreMap) {
                var found = false, //parent of document.documentElement is document.
                    parent = el;
                do {
                    found = !!ignoreMap[Li.getUID(parent)];
                } while (!found && (parent = parent.parentNode));
                return found;
            };

            return function (root, force) {
                root = root || document;

                //Find all vbox elements that has flex elements inside it.
                var parents = {},
                    els = Li.slice(root.querySelectorAll('.flex'));
                if (root.classList && root.classList.contains('flex')) {
                    els = ([root]).concat(els);
                }
                els.forEach(function (el) {
                    //this.elMap[Li.getUID(el)] = this.elMap[Li.getUID(el)] || {};
                    var parent = el.parentNode;
                    if (parent.classList.contains('vbox')) {
                        parents[Li.getUID(parent)] = {
                            el: parent,
                            level: this.getLevel(parent)
                        };
                    }
                }, this);

                //Sort vbox elements, such that top-level elements (in the DOM heirarchy) shows up first.
                var sorted = Li.values(parents);
                //sort decreasing order of level
                sorted.sort(function (a, b) {
                    return a.level - b.level;
                });
                sorted = sorted.map(function (info) {
                    return info.el;
                });

                //Go through each parent and set height for each flex item
                var vMap = {
                    class: 'vbox',
                    clientDim: 'clientHeight',
                    offsetDim: 'offsetHeight',
                    paddingStart: 'paddingTop',
                    paddingEnd: 'paddingBottom',
                    marginStart: 'marginTop',
                    marginEnd: 'marginBottom',
                    dim: 'height',
                    ignoreMap: {},
                };
                sorted.forEach(function (parent) {
                    var p = vMap; //pointer

                    if (!force && canIgnoreCalc(parent, p.ignoreMap)) {
                        return;
                    }
                    var parentStyle = window.getComputedStyle(parent),
                        parentDim = parent[p.clientDim] - parseInt(parentStyle[p.paddingStart], 10) - parseInt(parentStyle[p.paddingEnd], 10), //exclude padding, scrollbar, border & margin.
                        children = Li.slice(parent.children).filter(function (el) {
                            return Li.isDisplayed(el); //don't consider hidden children in calulcations
                        }),
                        flexItems = children.filter(function (el) {
                            var isFlex = el.classList.contains('flex');
                            if (isFlex) {
                                el.style[p.dim] = 'auto';
                            }
                            return isFlex;
                        }),
                        occupiedDim = children.reduce(function (v, el) {
                            if (!el.classList.contains('flex')) {
                                var computedStyle = window.getComputedStyle(el);
                                //ignore position absolute, fixed or sticky (i.e. anything that doesn't respect the flex axis).
                                if (computedStyle.position === 'static' || computedStyle.position === 'relative') {
                                    //include padding, scrollbar, border and margin.
                                    return v + el[p.offsetDim] + parseInt(computedStyle[p.marginStart], 10) + parseInt(computedStyle[p.marginEnd], 10);
                                } else {
                                    return v;
                                }
                            } else {
                                return v;
                            }
                        }, 0),
                        remainingDim = parentDim - occupiedDim,
                        flexDim = Math.floor(remainingDim / flexItems.length);
                    flexItems.forEach(function (el) {
                        var oldDim = el.style[p.dim],
                            newDim = flexDim + 'px';
                        el.style[p.dim] = newDim;
                        //For efficiency don't recalc if item is further a vbox and height hasn't changed
                        if (el.classList.contains(p.class) && oldDim === newDim) {
                            p.ignoreMap[Li.getUID(el)] = true;
                        }
                    });
                });
            };
        }()),

        getLevel: function (el) {
            var level = -1, //parent of document.documentElement is document.
                parent = el;
            while ((parent = parent.parentNode)) {
                level += 1;
            }
            return level;
        }
    };

    //If it's needed to be called for some reason.
    window.flexRecalc = module.flexRecalc.bind(module);

    window.addEventListener('resize', function () {
        module.flexRecalc();
    });
    module.flexRecalc();

    return module;
});
