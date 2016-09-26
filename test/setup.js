var jsdom = require('jsdom').jsdom,
    path = require('path');

//GLOBAL.describe = describe;
//GLOBAL.it = it;
GLOBAL.nodeRequire = require;
GLOBAL.System = GLOBAL.SystemJS = require('./system.src.js');

GLOBAL.document = jsdom('', {url: 'file://' + __dirname + path.sep + 'index.html'});
GLOBAL.window = document.defaultView;

GLOBAL.jQuery = GLOBAL.$ = require('jquery');
GLOBAL.navigator = window.navigator;
GLOBAL.location = window.location;
GLOBAL.XMLHttpRequest = window.XMLHttpRequest;

//require('./systemjs-emulator');

System.config({
    baseURL: 'file://' + path.resolve(__dirname, '../') + path.sep,
    paths: {
        'jquery': 'node_modules/jquery/dist/jquery.js', //unwrap the package.json path for dumb systemjs emulator.
        /*Plugins*/
        //'tpl': 'test/requirejs-tpl.js',
        //'css': 'test/require-css-dummy.js'
        css: 'test/systemjs-css.js',
        less: 'test/systemjs-less.js',
        tpl: 'test/systemjs-tpl.js'
    }
});


