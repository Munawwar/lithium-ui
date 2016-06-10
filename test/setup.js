require('./systemjs-requirejs');
requirejs.config({
    baseUrl: '../',
    paths: {
        'jquery': 'node_modules/jquery-node/jquery-node', //redirect jquery to jquery-node
        /*Plugins*/
        'tpl': 'test/requirejs-tpl',
        'css': 'test/require-css-dummy'
    }
});

GLOBAL.jQuery = GLOBAL.$ = require('jquery-node'); //also gives document global variable
GLOBAL.window = document.defaultView;
GLOBAL.navigator = {
    userAgent: 'nodejs'
};
