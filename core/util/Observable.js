define(['./util', '../../lib/lithium/src/lithium', 'jquery'], function (Lui, Li, $) {
    Lui.util.Observable = function (initVal) {
        var value,
            nodeBindings = [],
            uniqueNodes = {},
            observable = function me(val) {
                //Check whether value is called from a template or not.
                if (me.caller && me.caller.caller === Lui.util.Template.View.saferEval) {
                    var view = Lui.util.Template.View.currentlyEvaluating;
                    if (view) {
                        var node = view.currentlyEvaluating.node;
                        if (!uniqueNodes[node._uid]) {
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
                        nodeBindings.forEach(function (info) {
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

        observable(initVal);
        return observable;
    };

    Lui.util.ObservableArray = function (initVal) {
        var value = [],
            nodeBindings = [],
            uniqueNodes = {},
            observable = function me(val) {
                //Check whether value is called from a template or not.
                if (me.caller && me.caller.caller === Lui.util.Template.View.saferEval) {
                    var view = Lui.util.Template.View.currentlyEvaluating;
                    if (view) {
                        var node = view.currentlyEvaluating.node;
                        if (!uniqueNodes[node._uid]) {
                            uniqueNodes[node._uid] = view.currentlyEvaluating;
                            nodeBindings.push(view.currentlyEvaluating);
                        }
                    }
                }

                //Set if not undefined
                if (val !== undefined) {
                    if (Li.isArray(val)) {
                        value = val;
                        //Refresh UI
                        nodeBindings.forEach(function (info) {
                            var bindingHandler = info.view.bindingHandler[info.binding];
                            if (bindingHandler && bindingHandler.update) {
                                bindingHandler.update.call(info.view, info.node, info.binding, info.expr, info.extraInfo);
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
                nodeBindings.forEach(function (info) {
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
            push: function (val) {
                var items = Li.slice(arguments);
                if (items.length) {
                    this.splice.apply(this, ([value.length, 0]).concat(items));
                }
                return value.length;
            },
            pop: function () {
                return this.splice(value.length, 1)[0];
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
            }
            //TODO: Implement reverse, sort, remove(item), remove(function (item) {}), removeAll(), removeAll([items...]) like KO
        });

        observable(initVal);
        return observable;
    };

    return Lui;
});
