/*var Module = require('module');
var originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
    if ((/\.(ko|css)$/i).test(path)) {
        return console.log(path);
    }
    return originalRequire.apply(this, arguments);
};
*/

var nodePath = require('path');
global.rootRequire = function rootRequire(path) {
    return require(nodePath.resolve('./', path));
};

var jsdom = require('jsdom').jsdom,
    path = require('path');

global.document = jsdom('', {
    url: 'file://' + __dirname + path.sep + 'index.html',
    features: {
        FetchExternalResources : false,
        ProcessExternalResources: false
    }
});
global.window = document.defaultView;

global.jQuery = global.$ = require('jquery');
global.navigator = window.navigator;
global.location = window.location;
global.XMLHttpRequest = window.XMLHttpRequest;


// require('./systemjs-emulator');

global.System = require('./system.src.js');
global.System.config({
    baseURL: '../',
    paths: {
        'jquery': 'node_modules/jquery/dist/jquery.js' //unwrap the package.json path for dumb systemjs emulator.
    },
    meta: {
        // Plugins
        '*.ko': { loader: 'test/systemjs-tpl.js' },
        '*.css': { loader: 'test/systemjs-css.js' }
    }
});
