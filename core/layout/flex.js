/**
 * Flexbox's flex is broken on Chrome 49 (or even before that).
 * Non-flex items do not respect minimum content height when a flex item is around.
 * flex: 1 0 auto; was suggested as workaround, but that makes the flexed item to not have scrollbar (on overflow:scroll).
 */
define(['../base/lithium'], function (Li) {

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

            return function (root) {
                root = root || document;
                var parents = {},
                    els = Li.slice(root.querySelectorAll('.flex'));
                if (root.classList && root.classList.contains('flex')) {
                    els = ([root]).concat(els);
                }
                els.forEach(function (el) {
                    //this.elMap[Li.getUID(el)] = this.elMap[Li.getUID(el)] || {};
                    var parent = el.parentNode;
                    if (parent.classList.contains('hbox') || parent.classList.contains('vbox')) {
                        parents[Li.getUID(parent)] = {
                            el: parent,
                            level: this.getLevel(parent)
                        };
                    }
                }, this);

                var sorted = Li.values(parents);
                //sort decreasing order of level
                sorted.sort(function (a, b) {
                    return a.level - b.level;
                });
                sorted = sorted.map(function (info) {
                    return info.el;
                });

                //Go through each parent and set width/height for each flex item
                var hMap = {
                    class: 'hbox',
                    clientDim: 'clientWidth',
                    offsetDim: 'offsetWidth',
                    paddingStart: 'paddingLeft',
                    paddingEnd: 'paddingRight',
                    marginStart: 'marginLeft',
                    marginEnd: 'marginRight',
                    dim: 'width',
                    ignoreMap: {}
                },
                vMap = {
                    class: 'vbox',
                    clientDim: 'clientHeight',
                    offsetDim: 'offsetHeight',
                    paddingStart: 'paddingTop',
                    paddingEnd: 'paddingBottom',
                    marginStart: 'marginTop',
                    marginEnd: 'marginBottom',
                    dim: 'height',
                    ignoreMap: {},
                }
                sorted.forEach(function (parent) {
                    var p = (parent.classList.contains('hbox') ? hMap : vMap); //pointer

                    if (canIgnoreCalc(parent, p.ignoreMap)) {
                        return;
                    }
                    var parentStyle = window.getComputedStyle(parent),
                        parentDim = parent[p.clientDim] - parseInt(parentStyle[p.paddingStart], 10) + parseInt(parentStyle[p.paddingEnd], 10), //exclude padding, scrollbar, border & margin.
                        children = Li.slice(parent.children),
                        flexItems = children.filter(function (el) {
                            return el.classList.contains('flex');
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
                        //For efficiency don't recalc if item is further an hbox and width hasn't changed
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
