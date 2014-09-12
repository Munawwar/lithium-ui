define(['./Component'], function (Lui) {

    /**
     * Previously Box and Component were different. But now it is same.
     */
    Lui.Box = Lui.extend('Lui.Box', Lui.Component, {});

    return Lui;
});
