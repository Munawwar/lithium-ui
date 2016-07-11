define(['./lui.js',
    'jquery',
    './base/lithium.js'
], function (Li, $) {
    /**
     * Observable primitive value
     */
    Li.ObservablePrimitive = function (initVal) {
        var value,
            nodeBindings = [],
            uniqueNodes = {},
            observable = function (val) {
                //Check whether value is called from a template or not.
                var view = Li.Template.View.currentlyEvaluating;
                if (view) {
                    var info = view.currentlyEvaluating;
                    if (!uniqueNodes[getHash(info)] && !view.retired) {
                        uniqueNodes[getHash(info)] = info;
                        nodeBindings.push(info);
                    }
                }

                //Set if not undefined
                if (val !== undefined) {
                    var oldValue = value;
                    value = val;

                    //TODO: For objects, use oldValue.isEqual(val);
                    if (oldValue !== val) {
                        //Refresh UI
                        removeUnusedAndIterate(nodeBindings, uniqueNodes, updateBinding, this);
                    }
                } else {
                    return value;
                }
            };

        observable.isLiObservable = true;
        observable.isLiPrimitive = true;

        observable(initVal);
        return observable;
    };

    /**
     * Observable array.
     */
    Li.ObservableArray = function (initVal) {
        var value = [],
            nodeBindings = [],
            uniqueNodes = {},
            trackDependency = function () {
                //Check whether value is called from a template or not.
                var view = Li.Template.View.currentlyEvaluating;
                if (view) {
                    var info = view.currentlyEvaluating;
                    if (!uniqueNodes[getHash(info)] && !view.retired) {
                        uniqueNodes[getHash(info)] = info;
                        nodeBindings.push(info);
                    }
                }
            },
            observable = function (val) {
                trackDependency();

                //Set if not undefined
                if (val !== undefined) {
                    if (Li.isArray(val)) {
                        var oldValue = value;
                        value = val;

                        //Refresh UI
                        removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                            if (info.binding !== 'foreach') {
                                updateBinding.call(this, info);
                            } else {
                                var bindingHandler = info.view.bindingHandler[info.binding];
                                bindingHandler.splice.call(info.view, info.node, info.binding, info.expr, 0, oldValue.length, val);
                            }
                        }, this);
                    }
                } else {
                    return value.slice(0); //return slice, since original array shouldn't be modified
                }
            };

        $.extend(observable, {
            slice: function (start, end) {
                trackDependency();
                return value.slice(start, end);
            },
            splice: function (index, removeLength) {
                var items = Li.slice(arguments, 2);
                if (index < 0) {
                    index = value.length - index;
                }
                if (!Li.isNumber(index) || index < 0 || index > value.length) {
                    return;
                }

                var removedItems = value.splice.apply(value, [index, removeLength].concat(items));

                //Refresh UI
                removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                    if (info.binding !== 'foreach') {
                        updateBinding.call(this, info);
                    } else {
                        var bindingHandler = info.view.bindingHandler[info.binding];
                        bindingHandler.splice.call(info.view, info.node, info.binding, info.expr, index, removeLength, items);
                    }
                }, this);

                return removedItems;
            },
            push: function () {
                var items = Li.slice(arguments);
                if (items.length) {
                    this.splice.apply(this, ([value.length, 0]).concat(items));
                }
                return value.length;
            },
            pop: function () {
                return this.splice(value.length - 1, 1)[0];
            },
            shift: function () {
                return this.splice(0, 1)[0];
            },
            unshift: function () {
                var items = Li.slice(arguments);
                if (items.length) {
                    this.splice.apply(this, ([0, 0]).concat(items));
                }
                return value.length;
            },
            indexOf: function (o) {
                trackDependency();
                return value.indexOf(o);
            },
            reverse: function () {
                value.reverse();
                var len = value.length,
                    indexes = value.map(function (v, i) {
                        return (len - i - 1);
                    });
                //Refresh UI
                removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                    if (info.binding !== 'foreach') {
                        updateBinding.call(this, info);
                    } else {
                        var bindingHandler = info.view.bindingHandler[info.binding];
                        bindingHandler.sort.call(info.view, info.node, info.binding, info.expr, indexes);
                    }
                }, this);
            },
            sort: function (comparator) {
                var sorted = value.map(function (item, i) {
                    return {item: item, index: i};
                });
                sorted.sort(function (a, b) {
                    var result = comparator(a.item, b.item);
                    //stable sort
                    if (result === 0) {
                        result = (a.index < b.index ? -1 : 1);
                    }
                    return result;
                });

                //Note the change in index of each item.
                var hasChanged = false,
                    indexes = sorted.map(function (o, i) {
                        if (i !== o.index) {
                            hasChanged = true;
                        }
                        value[i] = o.item;
                        return o.index;
                    });

                //Refresh UI
                if (hasChanged) {
                    removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                        if (info.binding !== 'foreach') {
                            updateBinding.call(this, info);
                        } else {
                            var bindingHandler = info.view.bindingHandler[info.binding];
                            bindingHandler.sort.call(info.view, info.node, info.binding, info.expr, indexes);
                        }
                    }, this);
                }
            },
            remove: function (itemOrFunction) {
                var func;
                if (Li.isFunction(itemOrFunction)) {
                    func = itemOrFunction;
                } else {
                    func = function (item) {
                        return item === itemOrFunction;
                    };
                }

                //TODO: Improve performance whn removing from view.
                var removedItems = [];
                for (var i = value.length - 1; i >= 0; i -= 1) {
                    if (func(value[i])) {
                        this.splice(i, 1);
                        i += 1;
                        removedItems.unshift(value[i]);
                    }
                }
                return removedItems;
            },
            removeAll: function () {
                this.splice(0, value.length);
            },
            count: function () {
                trackDependency();
                return value.length;
            }
            //TODO: Implement removeAll([items...]) like KO
        });

        observable.isLiObservable = true;
        observable.isLiArray = true;

        observable(initVal);
        return observable;
    };

    /**
     * Function to detect initial type and create the appropriate Observable type.
     * Only two observable types are available Li.ObservablePrimitive and Li.ObservableArray.
     */
    Li.Observable = function (initVal) {
        if (Li.isArray(initVal)) {
            return Li.ObservableArray(initVal);
        } else {
            return Li.ObservablePrimitive(initVal);
        }
    };

    /**
     * Get unique hash for a node and it's binding.
     * @param {Object} currentlyEvaluating The contents of view.currentlyEvaluating.
     */
    function getHash(currentlyEvaluating) {
        return Li.getUID(currentlyEvaluating.node) + '#' + currentlyEvaluating.binding;
    }

    function updateBinding(info) {
        var binding = info.binding.split('.'),
            subBinding = binding.slice(1).join('.'),
            bindingHandler = info.view.bindingHandler[binding[0]];
        if (bindingHandler && bindingHandler.update) {
            bindingHandler.update.call(info.view, info.node, binding[0], info.expr, subBinding || undefined);
        }
    }

    function removeUnusedAndIterate(nodeBindings, uniqueNodes, callback, scope) {
        var bindingsToRemove;
        //Refresh UI
        nodeBindings.forEach(function (info, index) {
            if (!info.view.retired) {
                callback.call(scope, info, index);
            } else {
                bindingsToRemove = bindingsToRemove || [];
                bindingsToRemove.push(index);
                delete uniqueNodes[getHash(info)];
            }
        }, this);

        if (bindingsToRemove) {
            bindingsToRemove.reverse(); //remove from back, because removal from start would affect index of other items
            bindingsToRemove.forEach(function (pos) {
                nodeBindings.splice(pos, 1);
            });
        }
    }

    return Li;
});
