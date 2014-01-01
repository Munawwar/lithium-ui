//Assuming jQuery has been added

INCLUDE('lib:lithium.js');
INCLUDE('lib:lithium.observable.js');

INCLUDE('utils.js');

(function () {
    var t = function() {};
    Lui.Observable = t;
    Li.observable(t);
}());
