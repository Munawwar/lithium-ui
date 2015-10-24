define([
    'jquery',
    './lib/jquery.easing',
    './lib/jquery.hammer',
    './lib/velocity.min',

    'css!./lib/materialize/css/materialize.css'
], function ($) {
    //Helpers
    $.fn.reverse = [].reverse;

    return $;
})
