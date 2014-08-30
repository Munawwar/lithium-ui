define(['./util', '../../lib/lithium/src/lithium'], function (Lui, Li) {
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
                            console.log(view.currentlyEvaluating);
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

    return Lui;
});
