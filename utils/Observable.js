/*
 * Assuming following dependencies have been added:
 * jQuery
 * lithium.js
 * lithium.observable.js
 */

INCLUDE('utils.js');

(function () {
    var t = function() {};
    Lui.Observable = t;
    Li.observable(t);
}());
