var Li = require('../core/lui');

module.exports = {
    /**
     * Convert DocumentFragment to HTML.
     * Use second parameter to beautify HTML.
     *
     * Note: Beautification is experimental. Use for debugging purposes only.
     */
    toHTML: (function () {
        function unwrap(str) {
            return Li.toMap(str.split(','), true);
        }

        //HTML 4 and 5 void tags
        var voidTags = unwrap('area,base,basefont,br,col,command,embed,frame,hr,img,input,keygen,link,meta,param,source,track,wbr');

        return function (origHtml, beautify) {
            var df;
            if (Li.isString(origHtml)) {
                df = Li.dom(origHtml); //DocumentFragment
            } else if (origHtml.nodeType === 11) { //DocumentFragment
                df = origHtml;
            } else {
                throw new Error("Unsupported type for argument 'origHtml'.");
            }

            var html = '',
                level = 0;
            Li.traverse(df, df, function (node, isOpenTag) {
                if (node.nodeType === 1) {
                    var tag = node.nodeName.toLowerCase();
                    if (isOpenTag) {
                        if (beautify) {
                            html += '\n' + (new Array(level * 4 + 1)).join(' ');
                            level += 1;
                        }
                        html += '<' + tag;
                        Li.slice(node.attributes).forEach(function (attr) {
                            html += ' ' + attr.name + '="' + attr.value.replace(/"/g, '&quot;') + '"';
                        });
                        html += (voidTags[tag] ? '/>' : '>');
                    } else {
                        if (beautify) {
                            level -= 1;
                        }
                        if (!voidTags[tag]) {
                            if (beautify) {
                                html += '\n' + (new Array(level * 4 + 1)).join(' ');
                            }
                            html += '</' + tag + '>';
                        }
                    }
                }
                if (isOpenTag && node.nodeType === 3) {
                    var text = node.nodeValue || '';
                    if (beautify) {
                        text = text.trim();
                    }
                    //escape <,> and &. Except text node inside script or style tag.
                    if (!(/^(?:script|style)$/i).test(node.parentNode.nodeName)) {
                        text = text.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;");
                    }
                    html += text;
                }
                if (isOpenTag && node.nodeType === 8) {
                    if (beautify) {
                        html += '\n' + (new Array(level * 4 + 1)).join(' ');
                    }
                    html += '<!-- ' + node.data.trim() + ' -->';
                }
            }, this);
            return html;
        };
    }())
};
