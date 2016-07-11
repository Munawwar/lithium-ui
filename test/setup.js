require('./systemjs-emulator');
System.config({
    baseURL: '../',
    paths: {
        'jquery': 'node_modules/jquery-node/jquery-node.js', //redirect jquery to jquery-node
        /*Plugins*/
        'tpl': 'test/requirejs-tpl.js',
        'css': 'test/require-css-dummy.js'
    }
});

GLOBAL.jQuery = GLOBAL.$ = require('jquery-node'); //also gives document global variable
GLOBAL.window = document.defaultView;
GLOBAL.navigator = {
    userAgent: 'nodejs'
};
