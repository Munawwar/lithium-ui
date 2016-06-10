define([
    'jquery',
    './lib/jquery.easing.js',
    './lib/jquery.hammer.js',
    './lib/velocity.min.js',

    './lib/materialize/css/materialize.css!css'
], function ($) {
    //Helpers
    $.fn.reverse = [].reverse;

    return $;
})
