var $ = require('jquery');

require('./lib/jquery.easing.js');
require('./lib/jquery.hammer.js');
require('./lib/velocity.min.js');

require('./lib/materialize/css/materialize.css');

//Helpers
$.fn.reverse = [].reverse;

module.exports = $;