/**
 * MIT License
 */

/*global GLOBAL, console*/

var path = require('path');

var modules = {};

function getDependencies(deps, callerScript) {
    var cfg = GLOBAL.requirejs.cfg,
        callerPath = callerScript.split(path.sep).slice(0, -1).join(path.sep); //Remove script name.

    //Find dependencies
    deps.forEach(function (depPath, i) {
        //Detect plugins and handle them first
        if ((/!\w+$/).test(depPath)) {
            return (deps[i] = handlePlugin(depPath, callerScript));
        }

        var fullPath;
        if (depPath.search(/^(http:\/\/|https:\/\/|\/\/)/) > -1) {
            console.warn(callerScript + ': http,https URLs aren\'t supported.');
            fullPath = depPath;
            modules[fullPath] = {};
        } else if (depPath[0] === '.') { //Path relative to caller script.
            depPath = depPath.replace(/\.js$/, '');
            fullPath = path.resolve(callerPath, depPath);
        } else if (cfg.paths[depPath]) { //If module name is in config, use that instead
            fullPath = cfg.paths[depPath];
        } else if (depPath[0] === '/') { //Absolute path
            depPath = depPath.replace(/\.js$/, '');
            fullPath = depPath;
        } else { //Path relative to baseUrl
            depPath = depPath.replace(/\.js$/, '');
            fullPath = path.resolve(cfg.baseUrl, depPath);
        }

        //console.log(' -- Dependency ' + fullPath);
        if (!modules[fullPath]) {
            var ret = require(fullPath);
            //Support for UMD. if ret exists, then the script took the commonjs require() route.
            if (typeof ret === 'function' || Object.keys(ret).length) {
                modules[fullPath] = ret;
            }
        }
        deps[i] = modules[fullPath];
    });

    return deps;
}

GLOBAL.requirejs = function (deps, callback) {
    if (arguments.length === 1) {
        callback = deps;
        deps = [];
    }

    //Figure out the path of the JS file that called this function.
    var callerScript = findCallerFromError(new Error());

    //Find dependencies
    deps = getDependencies(deps, callerScript);

    callback.apply(null, deps);
};

GLOBAL.requirejs.config = function (cfg) {
    if (!cfg) {
        return this.cfg;
    } else {
        this.cfg = cfg;

        //Figure out the path of the JS file that called this function.
        var callerScript = findCallerFromError(new Error()),
            callerPath = callerScript.split(path.sep).slice(0, -1).join(path.sep); //Remove script name.

        cfg.baseUrl = path.resolve(callerPath, cfg.baseUrl);
        //console.log('baseUrl = ' + cfg.baseUrl);

        Object.keys(cfg.paths || {}).forEach(function (moduleName) {
            var fullPath = path.resolve(cfg.baseUrl, cfg.paths[moduleName]);
            //console.log('Resolved path for ' + moduleName + ' to ' + path);
            cfg.paths[moduleName] = fullPath;
        });
    }
};

GLOBAL.define = function (name, deps, moduleFactory) {
    var args = Array.prototype.slice.call(arguments);

    moduleFactory = args.pop();
    deps = args.pop() || [];
    name = args.pop();

    //Figure out the path of the JS file that called this function.
    var callerScript = findCallerFromError(new Error());
    //console.log('define() called from ' + callerScript);

    //Find dependencies
    deps = getDependencies(deps, callerScript);

    //console.log('Executing ' + callerScript);
    var ret = moduleFactory; // Support define(<object>)
    if (typeof moduleFactory === 'function') {
        ret = moduleFactory.apply(null, deps);
    }

    if (name) {
        modules[name] = ret;
    }
    modules[callerScript.replace(/\.js$/, '')] = ret;
};

/*
 * Find the caller script path from an Error object.
 * The observation is that the caller path is exactly at the third line of the stack trace.
 */
function findCallerFromError(err) {
    var callerScript = err.stack.split('\n')[2], // caller path is exactly at the third line of the stack trace.
        pos = callerScript.indexOf('(') + 1;
    if (pos <= 0) {
        pos = callerScript.indexOf('at ') + 3;
    }
    callerScript = callerScript.substr(pos).split(':')[0];
    return callerScript;
}

/*
 * Load a 'string!plugin' dependency.
 */
function handlePlugin(depPath, callerScript) {
    var cfg = GLOBAL.requirejs.cfg,
        match = depPath.match(/([^!]+)!(\w+)$/),
        fileName = match[1],
        name = match[2],
        callerPath = callerScript.split(path.sep).slice(0, -1).join(path.sep); //Remove script name.

    //Load plugin if not loaded
    if (!modules[name]) {
        //The plugin should be there in cfg.paths
        if (cfg.paths[name]) {
            require(cfg.paths[name]);
            if (modules[cfg.paths[name]]) {
                modules[name] = modules[cfg.paths[name]];
            }
        }
    }

    if (modules[name] && modules[name].load) {
        var dep;
        callPlugin(name, fileName, callerPath, function (value) {
            dep = value;
        });
        return dep;
    } else {
        console.warn(callerScript + ': Could not find plugin. Plugin was not defined or was not included in path config.');
        return null;
    }
}

/*
 * @param {String} filepath The string that appears after the ! in the plugin string. Most of the time it's a file path.
 */
function callPlugin(pluginName, filepath, callerPath, onload) {
    var req = function (deps, callback) { //special require function, intended to be sent to plugin.load()
        deps.forEach(function (depPath, i) {
            if (depPath[0] === '.') { //path relative to callerPath
                depPath[i] = path.resolve(callerPath, depPath);
            }
        });
        GLOBAL.requirejs(deps, callback);
    };
    req.toUrl = function (depPath) {
        return path.resolve(callerPath, depPath);
    };
    req.defined = req.specified = function (moduleName) {
        return !!modules[moduleName];
    };

    //onload should be called syncronously.
    modules[pluginName].load(filepath, req, onload);
}
