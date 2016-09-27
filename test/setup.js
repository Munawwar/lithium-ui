var jsdom = require('jsdom').jsdom,
    path = require('path');
GLOBAL.document = jsdom('', {
    url: 'file://' + __dirname + path.sep + 'index.html',
    features: {
        FetchExternalResources : false,
        ProcessExternalResources: false
    }
});
GLOBAL.window = document.defaultView;

GLOBAL.jQuery = GLOBAL.$ = require('jquery');
GLOBAL.navigator = window.navigator;
GLOBAL.location = window.location;
GLOBAL.XMLHttpRequest = window.XMLHttpRequest;

require('./systemjs-emulator');
System.config({
    baseURL: '../',
    paths: {
        'jquery': 'node_modules/jquery/dist/jquery.js', //unwrap the package.json path for dumb systemjs emulator.
        /*Plugins*/
        'tpl': 'test/requirejs-tpl.js',
        'css': 'test/require-css-dummy.js'
    }
});


