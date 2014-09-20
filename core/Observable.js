if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(['./lui', '../lib/lithium/src/lithium', 'jquery-node'], function (Lui, Li, $) {
    Lui.Observable = function (initVal) {
        var value,
            nodeBindings = [],
            uniqueNodes = {},
            observable = function me(val) {
                //Check whether value is called from a template or not.
                if (me.caller && (me.caller === Lui.Template.View.prototype.evaluate ||
                    me.caller.caller === Lui.Template.View.saferEval)) {
                    var view = Lui.Template.View.currentlyEvaluating;
                    if (view) {
                        var node = view.currentlyEvaluating.node;
                        if (!uniqueNodes[node._uid] && !view.retired) {
                            uniqueNodes[node._uid] = view.currentlyEvaluating;
                            nodeBindings.push(view.currentlyEvaluating);
                        }
                    }
                }

                //Set if not undefined
                if (val !== undefined) {
                    var oldValue = value;
                    value = val;

                    //TODO: For objects, use oldValue.isEqual(val);
                    if (oldValue !== val) {
                        //Refresh UI
                        removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                            var bindingHandler = info.view.bindingHandler[info.binding];
                            if (bindingHandler && bindingHandler.update) {
                                bindingHandler.update.call(info.view, info.node, info.binding, info.expr, info.extraInfo);
                            }
                        }, this);
                    }
                } else {
                    return value;
                }
            };

        observable.isLuiObservable = true;

        observable(initVal);
        return observable;
    };


    Lui.ObservableArray = function (initVal) {
        var value = [],
            nodeBindings = [],
            uniqueNodes = {},
            trackDependency = function () {
                //Check whether value is called from a template or not.
                var me = trackDependency.caller;
                if (me.caller && (me.caller === Lui.Template.View.prototype.evaluate ||
                    me.caller.caller === Lui.Template.View.saferEval)) {
                    var view = Lui.Template.View.currentlyEvaluating;
                    if (view) {
                        var node = view.currentlyEvaluating.node;
                        if (!uniqueNodes[node._uid] && !view.retired) {
                            uniqueNodes[node._uid] = view.currentlyEvaluating;
                            nodeBindings.push(view.currentlyEvaluating);
                        }
                    }
                }
            },
            observable = function me(val) {
                trackDependency();

                //Set if not undefined
                if (val !== undefined) {
                    if (Li.isArray(val)) {
                        var oldValue = value;
                        value = val;

                        //Refresh UI
                        removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                            var bindingHandler = info.view.bindingHandler[info.binding];
                            if (info.binding !== 'foreach') {
                                if (bindingHandler && bindingHandler.update) {
                                    bindingHandler.update.call(info.view, info.node, info.binding, info.expr, info.extraInfo);
                                }
                            } else {
                                bindingHandler.splice.call(info.view, info.node, info.binding, info.expr, 0, oldValue.length, val);
                            }
                        }, this);
                    }
                } else {
                    return value.slice(0); //return slice, since original array shouldn't be modified
                }
            };

        $.extend(observable, {
            slice: function () {
                return value.slice(0);
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
                    var bindingHandler = info.view.bindingHandler[info.binding];
                    if (info.binding !== 'foreach') {
                        if (bindingHandler && bindingHandler.update) {
                            //TODO: Hmm..how to efficiently update?
                            bindingHandler.update.call(info.view, info.node, info.binding, info.expr, info.extraInfo);
                        }
                    } else {
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
                return value.indexOf(o);
            },
            reverse: function () {
                value.reverse();
                //Refresh UI
                removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                    var bindingHandler = info.view.bindingHandler[info.binding];
                    if (info.binding !== 'foreach') {
                        if (bindingHandler && bindingHandler.update) {
                            //TODO: Hmm..how to efficiently update?
                            bindingHandler.update.call(info.view, info.node, info.binding, info.expr, info.extraInfo);
                        }
                    } else {
                        bindingHandler.reverse.call(info.view, info.node, info.binding, info.expr);
                    }
                }, this);
            },
            sort: function (comparator) {
                var indexes = value.map(function (item, i) {
                        return i;
                    }),
                    hasChanged = false;
                indexes.sort(function (a, b) {
                    var result = comparator(value[a], value[b]),
                        temp;
                    //Swap
                    if ((a < b && result > 0) || (b < a && result < 0)) {
                        temp = value[a];
                        value[a] = value[b];
                        value[b] = temp;
                        hasChanged = true;
                    }

                    //stable sort
                    if (result === 0) {
                        result = (a < b ? -1 : 1);
                    }
                    return result;
                });

                //Refresh UI
                if (hasChanged) {
                    removeUnusedAndIterate(nodeBindings, uniqueNodes, function (info) {
                        var bindingHandler = info.view.bindingHandler[info.binding];
                        if (info.binding !== 'foreach') {
                            if (bindingHandler && bindingHandler.update) {
                                //TODO: Hmm..how to efficiently update?
                                bindingHandler.update.call(info.view, info.node, info.binding, info.expr, info.extraInfo);
                            }
                        } else {
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

        observable.isLuiObservable = true;
        observable.isLuiObservableArray = true;

        observable(initVal);
        return observable;
    };

    function removeUnusedAndIterate(nodeBindings, uniqueNodes, callback, scope) {
        var bindingsToRemove;
        //Refresh UI
        nodeBindings.forEach(function (info, index) {
            if (!info.view.retired) {
                callback.call(scope, info, index);
            } else {
                bindingsToRemove = bindingsToRemove || [];
                bindingsToRemove.push(index);
                delete uniqueNodes[info.node._uid];
            }
        }, this);

        if (bindingsToRemove) {
            bindingsToRemove.reverse(); //remove from back, because removal from start would affect index of other items
            bindingsToRemove.forEach(function (pos) {
                nodeBindings.splice(pos, 1);
            });
        }
    }

    return Lui;
});
