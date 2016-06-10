define(['./Component.js'], function (Li) {

    /**
     * Previously Box and Component were different. But now it is same.
     */
    Li.Box = Li.extend('Li.Box', Li.Component, {
        innerTpl: new Li.Template(' ') //dummy innerTpl
    });

    return Li;
});
