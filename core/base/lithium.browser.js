/**
 * @class Li
 */

/**
 * Browser information. This object has 3 sub-properties: name, version and OS.<br/>
 * Overrides jQuery.browser.
 * You also get three 'is' prefixed boolean properties attached to Li:<br/>
 * 1. for OS (e.g Li.isWindows), 2. for browser vendor (e.g Li.isIE), and 3. vendor+version (e.g Li.isIE8).
 * @property browser
 * @type Object
 * @final
 * @credits Modified code from from http://www.quirksmode.org/js/detect.html.
 */
(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(['./lithium.js', 'jquery'], factory);
    } else if (typeof exports === 'object') { //For NodeJS, ignore
        module.exports = require('./lithium');
    } else { //global
        factory(window.Li, jQuery);
    }
}(function (Li) {
    var agent = navigator.userAgent.toLowerCase(),
        it, match,
        name, version, OS, OSVersion,
        browserList = [
            [/edge.([\d\.]+)/, 'MSEdge'],
            [/iemobile.([\d\.]+)/, 'IEMobile'],
            [/msie.([\d\.]+)/, 'IE'],
            [/trident.+rv.([\d\.]+)/, 'IE'],
            [/chrome.([\d\.]+)/, 'Chrome'],
            [/firefox.([\d\.]+)/, 'Firefox'],
            [/version\/([\d\.]+).+?safari/, 'Safari'],
            [/opera.+?version\/([\d\.]+)/, 'Opera'],
            [/rv.([\d\.]+).+?gecko/, 'Gecko'],
            [/applewebkit.([\d\.]+)/, 'WebKit']
        ],
        OSList = [
            [/windows phone os ([\d\.]+)/, "WindowsPhone"],
            [/windows (nt [\d\.]+)/, "Windows"],
            [/mac os x ([\d_]+)/, "Mac"],
            [/android ([\d\.]+)/, "Android"],
            [/linux/, "Linux"],
            [/iphone os ([\d_]+)/, "IPhone"],
            [/ipad.+?os ([\d_]+)/, "IPad"],
            [/blackberry (\d+)/, "BlackBerry"],
            [/symbianos.([\d\.]+)/, "Symbian"]
        ];

    while ((it = browserList.shift())) {
        match = agent.match(it[0]);
        if (match) {
            name = it[1];
            version = match[1];
            break;
        }
    }

    if (name) {
        Li["is" + name] = true;
        if (version) {
            Li["is" + name + parseInt(version, 10)] = true;
        }
    }

    Li.isWebKit = Li.isChrome || Li.isSafari || Li.isWebKit;
    Li.isGecko = Li.isFirefox || Li.isGecko;
    Li.isIOS = Li.isIPhone || Li.isIPad;
    Li.isMobile = Li.isAndroid || Li.isIPhone || Li.isBlackBerry || Li.isWindowsPhone || Li.isSymbian;
    //Detecting ' mobile ' from user agent isn't perfect but good enough.
    //http://stackoverflow.com/questions/5341637/how-do-detect-android-tablets-in-general-useragent
    if ((Li.isAndroid || Li.isBlackBerry) && !(/ mobile /).test(agent)) {
        delete Li.isMobile;
    }

    //TODO: Detect Googlebot
    //TODO: Detect IE compatibility mode

    while ((it = OSList.shift())) {
        match = agent.match(it[0]);
        if (match) {
            OS = it[1];
            if ((OSVersion = match[1])) {
                OSVersion = OSVersion.replace('_', '.');
            }
            break;
        }
    }
    if (OS) {
        Li["is" + OS] = true;
    }

    //Bug that WebKit is being detected as Safari on non-iOS phones/tablets
    if (Li.isSafari && (Li.isAndroid || Li.isBlackBerry || Li.isSymbian)) {
        delete Li.isSafari;
        delete Li["is" + name + parseInt(version, 10)];
        name = 'WebKit';
        version = agent.match(/applewebkit.([\d\.]+)/)[1];
        Li["is" + name + parseInt(version, 10)] = true;
    }

    Li.browser = {
        name: name,
        version: version,
        OS: OS,
        OSVersion: OSVersion
    };

    //Add browser-specifc class to body
    $(document).ready(function () {
        var name = Li.browser.name.toLowerCase(),
            version = parseInt(Li.browser.version, 10);
        $(document.body).addClass(name);
        if (Li.isIE || Li.isMSEdge) {
            $(document.body).addClass(name + version);
        }
        if (Li.isWebKit) {
            $(document.body).addClass('webkit');
        }
    });

    return Li;
}));
