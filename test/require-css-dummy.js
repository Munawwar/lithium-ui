/*
 * Dummy plugin that returns empty string. CSS/Less loading isn't required on node.
 */
define({
    load: function (name, req, load, config) {
        load('');
    }
});
