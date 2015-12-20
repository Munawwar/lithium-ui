require('../setup');

var assert = require("assert"),
    fs = require('fs'),
    path = require('path'),
    utils = require('../utils');

requirejs(['components/Button'], function (Li) {
    var button = new Li.Button({}),
        df = document.createDocumentFragment();
    button.render(df);
    console.log(utils.toHTML(df));
});
