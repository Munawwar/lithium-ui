/**
 * MIT License
 */

/*global global, console*/

var path = require('path');

global.nodeRequire = require;

var modules = {};
function getDependencies(deps, callerScript) {
    var cfg = global.SystemJS.cfg,
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
            fullPath = path.resolve(callerPath, depPath);
        } else if (cfg.paths[depPath]) { //If module name is in config, use that instead
            fullPath = cfg.paths[depPath];
        } else if (depPath[0] === '/') { //Absolute path
            fullPath = depPath;
        } else { //Path relative to baseURL
            fullPath = path.resolve(cfg.baseURL, depPath);
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

var System = function (deps, callback) {
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
global.System = global.SystemJS = System;

Object.assign(System, {
    config: function (cfg) {
        if (!cfg) {
            return this.cfg;
        } else {
            this.cfg = cfg;

            //Figure out the path of the JS file that called this function.
            var callerScript = findCallerFromError(new Error()),
                callerPath = callerScript.split(path.sep).slice(0, -1).join(path.sep); //Remove script name.

            cfg.baseURL = path.resolve(callerPath, cfg.baseURL || '');
            //console.log('baseURL = ' + cfg.baseURL);

            Object.keys(cfg.paths || {}).forEach(function (moduleName) {
                var fullPath = path.resolve(cfg.baseURL, cfg.paths[moduleName]);
                //console.log('Resolved path for ' + moduleName + ' to ' + path);
                cfg.paths[moduleName] = fullPath;
            });
        }
    },

    import: function (dep) {
        //Figure out the path of the JS file that called this function.
        var callerScript = findCallerFromError(new Error());
        //console.log('import() called from ' + callerScript);

        //Find dependencies
        dep = getDependencies([dep], callerScript);

        return new Promise(function (resolve, reject) {
            resolve(dep[0]);
        });
    }
});

global.define = function (name, deps, moduleFactory) {
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
    modules[callerScript] = ret;
};

global.define.amd = false; //This is done intentioanlly, so that code using UMD takes uses' node require()s.

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
    var cfg = global.SystemJS.cfg,
        match = depPath.match(/([^!]+)!(\w+)$/),
        fileName = match[1],
        name = match[2],
        callerPath = callerScript.split(path.sep).slice(0, -1).join(path.sep); //Remove script name.

    //Load plugin if not loaded
    if (!modules[name]) {
        //The plugin should be there in cfg.paths
        var pluginPath = (cfg.paths[name] || '');
        if (pluginPath) {
            require(pluginPath);
            if (modules[pluginPath]) {
                modules[name] = modules[pluginPath];
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
        global.define(deps, callback);
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
