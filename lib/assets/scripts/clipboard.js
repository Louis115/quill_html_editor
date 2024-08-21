__webpack_require__.r(__webpack_exports__);


// Harmony exports
__webpack_require__.d(__webpack_exports__, "default", function() { return Clipboard; });
__webpack_require__.d(__webpack_exports__, "matchAttributor", function() { return matchAttributor; });
__webpack_require__.d(__webpack_exports__, "matchBlot", function() { return matchBlot; });
__webpack_require__.d(__webpack_exports__, "matchNewline", function() { return matchNewline; });
__webpack_require__.d(__webpack_exports__, "matchText", function() { return matchText; });
__webpack_require__.d(__webpack_exports__, "traverse", function() { return traverse; });


// Module imports
var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);
var quill_delta__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
var quill_delta__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_1__);
var parchment__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
var _blots_block__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
var _core_quill__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
var _core_logger__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../core/logger */ "./core/logger.js");
var _core_module__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
var _formats_align__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../formats/align */ "./formats/align.js");
var _formats_background__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../formats/background */ "./formats/background.js");
var _formats_code__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../formats/code */ "./formats/code.js");
var _formats_color__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../formats/color */ "./formats/color.js");
var _formats_direction__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../formats/direction */ "./formats/direction.js");
var _formats_font__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../formats/font */ "./formats/font.js");
var _formats_size__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../formats/size */ "./formats/size.js");


const debug = Object(_core_logger__WEBPACK_IMPORTED_MODULE_5__["default"])('quill:clipboard');
let tableRowValue = 0; // Variable to store the row value


const CLIPBOARD_CONFIG = [
    [Node.TEXT_NODE, matchText],
    [Node.TEXT_NODE, matchNewline],
    ['br', matchBreak],
    [Node.ELEMENT_NODE, matchNewline],
    [Node.ELEMENT_NODE, matchBlot],
    [Node.ELEMENT_NODE, matchAttributor],
    [Node.ELEMENT_NODE, matchStyles],
    ['li', matchIndent],
    ['ol, ul', matchList],
    ['pre', matchCodeBlock],
    ['tr', matchTable],
    ['b', matchAlias.bind(matchAlias, 'bold')],
    ['i', matchAlias.bind(matchAlias, 'italic')],
    ['strike', matchAlias.bind(matchAlias, 'strike')],
    ['style', matchIgnore],
];

const ATTRIBUTE_ATTRIBUTORS = [
    _formats_align__WEBPACK_IMPORTED_MODULE_7__["AlignAttribute"],
    _formats_direction__WEBPACK_IMPORTED_MODULE_11__["DirectionAttribute"]
].reduce((memo, attr) => {
    memo[attr.keyName] = attr;
    return memo;
}, {});

const STYLE_ATTRIBUTORS = [
    _formats_align__WEBPACK_IMPORTED_MODULE_7__["AlignStyle"],
    _formats_background__WEBPACK_IMPORTED_MODULE_8__["BackgroundStyle"],
    _formats_color__WEBPACK_IMPORTED_MODULE_10__["ColorStyle"],
    _formats_direction__WEBPACK_IMPORTED_MODULE_11__["DirectionStyle"],
    _formats_font__WEBPACK_IMPORTED_MODULE_12__["FontStyle"],
    _formats_size__WEBPACK_IMPORTED_MODULE_13__["SizeStyle"]
].reduce((memo, attr) => {
    memo[attr.keyName] = attr;
    return memo;
}, {});



class Clipboard extends _core_module__WEBPACK_IMPORTED_MODULE_6__["default"] {
    constructor(quill, options) {
        super(quill, options);
        this.quill.root.addEventListener('copy', e => this.onCaptureCopy(e, false));
        this.quill.root.addEventListener('cut', e => this.onCaptureCopy(e, true));
        this.quill.root.addEventListener('paste', this.onCapturePaste.bind(this));
        this.matchers = [];
        this.clipboardRowsCount = 0;
        CLIPBOARD_CONFIG.concat(this.options.matchers).forEach(([selector, matcher]) => {
            this.addMatcher(selector, matcher);
        });
    }


    addMatcher(selector, matcher) {
        this.matchers.push([selector, matcher]);
    }

    convert({ html, text }, formats = {}) {
        if (formats[_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]) {
            return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(text, {
                [_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]: formats[_formats_code__WEBPACK_IMPORTED_MODULE_9__["default"].blotName]
            });
        }

        if (!html) {
            return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(text || '');
        }

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const container = doc.body;
        const nodeMatches = new WeakMap();
        const [elementMatchers, textMatchers] = this.prepareMatching(container, nodeMatches);
        const delta = traverse(this.quill.scroll, container, elementMatchers, textMatchers, nodeMatches);

        // Remove trailing newline
        if (deltaEndsWith(delta, '\n') && (delta.ops[delta.ops.length - 1].attributes == null || formats.table)) {
            return delta.compose(new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().retain(delta.length() - 1).delete(1));
        }

        return delta;
    }

    dangerouslyPasteHTML(index, html, source = _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
        if (typeof index === 'string') {
            const delta = this.convert({ html: index, text: '' });
            this.quill.setContents(delta, html);
            this.quill.setSelection(0, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
        } else {
            const paste = this.convert({ html, text: '' });
            this.quill.updateContents(new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().retain(index).concat(paste), source);
            this.quill.setSelection(index + paste.length(), _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
        }
    }

    onCaptureCopy(e, isCut = false) {
        if (e.defaultPrevented) return;
        e.preventDefault();
        const [range] = this.quill.selection.getRange();
        if (range == null) return;
        const { html, text } = this.onCopy(range, isCut);
        e.clipboardData.setData('text/plain', text);
        e.clipboardData.setData('text/html', html);

        if (isCut) {
            this.quill.deleteText(range, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER);
        }
    }

    onCapturePaste(e) {
        if (e.defaultPrevented || !this.quill.isEnabled()) return;
        e.preventDefault();
        const range = this.quill.getSelection(true);
        if (range == null) return;
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        const files = Array.from(e.clipboardData.files || []);

        if (!html && files.length > 0) {
            this.quill.uploader.upload(range, files);
        } else {
            this.onPaste(range, { html, text });
        }
    }

    onCopy(range) {
        const text = this.quill.getText(range);
        const html = this.quill.getSemanticHTML(range);
        return { html, text };
    }

    onPaste(range, { text, html }) {
        const formats = this.quill.getFormat(range.index);
        const pastedDelta = this.convert({ text, html }, formats);
        debug.log('onPaste', pastedDelta, { text, html });
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a()
            .retain(range.index)
            .delete(range.length)
            .concat(pastedDelta);
        this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER);
        this.quill.setSelection(delta.length() - range.length, _core_quill__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
        this.quill.scrollIntoView();
    }

    prepareMatching(container, nodeMatches) {
        const elementMatchers = [];
        const textMatchers = [];
        this.matchers.forEach(pair => {
            const [selector, matcher] = pair;

            switch (selector) {
                case Node.TEXT_NODE:
                    textMatchers.push(matcher);
                    break;

                case Node.ELEMENT_NODE:
                    elementMatchers.push(matcher);
                    break;

                default:
                    Array.from(container.querySelectorAll(selector)).forEach(node => {
                        if (nodeMatches.has(node)) {
                            const matches = nodeMatches.get(node);
                            matches.push(matcher);
                        } else {
                            nodeMatches.set(node, [matcher]);
                        }
                    });
                    break;
            }
        });
        return [elementMatchers, textMatchers];
    }
}

Clipboard.DEFAULTS = {
    matchers: []
};

function applyFormat(delta, format, value) {
    if (typeof format === 'object') {
        return Object.keys(format).reduce((newDelta, key) => {
            return applyFormat(newDelta, key, format[key]);
        }, delta);
    }

    return delta.reduce((newDelta, op) => {
        if (op.attributes && op.attributes[format]) {
            return newDelta.push(op);
        }

        return newDelta.insert(op.insert, extend__WEBPACK_IMPORTED_MODULE_0___default()({}, { [format]: value }, op.attributes));
    }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
}

function deltaEndsWith(delta, text) {
    let endText = '';

    for (let i = delta.ops.length - 1; i >= 0 && endText.length < text.length; --i) {
        const op = delta.ops[i];
        if (typeof op.insert !== 'string') break;
        endText = op.insert + endText;
    }

    return endText.slice(-1 * text.length) === text;
}

function isLine(node) {
    if (node.childNodes.length === 0) return false;

    return [
        'address', 'article', 'blockquote', 'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset',
        'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
        'iframe', 'li', 'main', 'nav', 'ol', 'output', 'p', 'pre', 'section', 'table', 'td', 'tr', 'ul', 'video'
    ].includes(node.tagName.toLowerCase());
}

const preNodes = new WeakMap();

function isPre(node) {
    if (node == null) return false;

    if (!preNodes.has(node)) {
        if (node.tagName === 'PRE') {
            preNodes.set(node, true);
        } else {
            preNodes.set(node, isPre(node.parentNode));
        }
    }

    return preNodes.get(node);
}

function traverse(scroll, node, elementMatchers, textMatchers, nodeMatches) {
    // Post-order traversal
    if (node.nodeType === node.TEXT_NODE) {
        return textMatchers.reduce((delta, matcher) => {
            return matcher(node, delta, scroll);
        }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
    }

    if (node.nodeType === node.ELEMENT_NODE) {
        return Array.from(node.childNodes || []).reduce((delta, childNode) => {
            let childrenDelta = traverse(scroll, childNode, elementMatchers, textMatchers, nodeMatches);

            if (childNode.nodeType === node.ELEMENT_NODE) {
                childrenDelta = elementMatchers.reduce((reducedDelta, matcher) => {
                    return matcher(childNode, reducedDelta, scroll);
                }, childrenDelta);
                childrenDelta = (nodeMatches.get(childNode) || []).reduce((reducedDelta, matcher) => {
                    return matcher(childNode, reducedDelta, scroll);
                }, childrenDelta);
            }

            return delta.concat(childrenDelta);
        }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
    }

    return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a();
}

function matchAlias(format, node, delta) {
    return applyFormat(delta, format, true);
}

function matchAttributor(node, delta, scroll) {
    const attributes = parchment__WEBPACK_IMPORTED_MODULE_2__["Attributor"].keys(node);
    const classes = parchment__WEBPACK_IMPORTED_MODULE_2__["ClassAttributor"].keys(node);
    const styles = parchment__WEBPACK_IMPORTED_MODULE_2__["StyleAttributor"].keys(node);
    const formats = {};

    attributes.concat(classes).concat(styles).forEach(name => {
        let attr = scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].ATTRIBUTE);

        if (attr != null) {
            formats[attr.attrName] = attr.value(node);
            if (formats[attr.attrName]) return;
        }

        attr = ATTRIBUTE_ATTRIBUTORS[name];

        if (attr != null && (attr.attrName === name || attr.keyName === name)) {
            formats[attr.attrName] = attr.value(node) || undefined;
        }

        attr = STYLE_ATTRIBUTORS[name];

        if (attr != null && (attr.attrName === name || attr.keyName === name)) {
            attr = STYLE_ATTRIBUTORS[name];
            formats[attr.attrName] = attr.value(node) || undefined;
        }
    });

    if (Object.keys(formats).length > 0) {
        return applyFormat(delta, formats);
    }

    return delta;
}

function matchBlot(node, delta, scroll) {
    const match = scroll.query(node);
    if (match == null) return delta;

    if (match.prototype instanceof parchment__WEBPACK_IMPORTED_MODULE_2__["EmbedBlot"]) {
        const embed = {};
        const value = match.value(node);

        if (value != null) {
            embed[match.blotName] = value;
            return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(embed, match.formats(node, scroll));
        }
    } else {
        if (match.prototype instanceof parchment__WEBPACK_IMPORTED_MODULE_2__["BlockBlot"] && !deltaEndsWith(delta, '\n')) {
            delta.insert('\n');
        }

        if (typeof match.formats === 'function') {
            return applyFormat(delta, match.blotName, match.formats(node, scroll));
        }
    }

    return delta;
}

function matchBreak(node, delta) {
    if (!deltaEndsWith(delta, '\n')) {
        delta.insert('\n');
    }

    return delta;
}

function matchCodeBlock(node, delta, scroll) {
    const match = scroll.query('code-block');
    const language = match ? match.formats(node, scroll) : true;
    return applyFormat(delta, 'code-block', language);
}

function matchIgnore() {
    return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a();
}

function matchIndent(node, delta, scroll) {
    const match = scroll.query(node);

    if (match == null || match.blotName !== 'list' || !deltaEndsWith(delta, '\n')) {
        return delta;
    }

    let indent = -1;
    let parent = node.parentNode;

    while (parent != null) {
        if (['OL', 'UL'].includes(parent.tagName)) {
            indent += 1;
        }

        parent = parent.parentNode;
    }

    if (indent <= 0) return delta;

    return delta.reduce((composed, op) => {
        if (op.attributes && op.attributes.list) {
            return composed.push(op);
        }

        return composed.insert(op.insert, {
            indent,
            ...(op.attributes || {})
        });
    }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a());
}

function matchList(node, delta) {
    const list = node.tagName === 'OL' ? 'ordered' : 'bullet';
    return applyFormat(delta, 'list', list);
}

function matchNewline(node, delta, scroll) {
    if (!deltaEndsWith(delta, '\n')) {
        if (isLine(node)) {
            return delta.insert('\n');
        }

        if (delta.length() > 0 && node.nextSibling) {
            let { nextSibling } = node;

            while (nextSibling != null) {
                if (isLine(nextSibling)) {
                    return delta.insert('\n');
                }

                const match = scroll.query(nextSibling);

                if (match && match.prototype instanceof _blots_block__WEBPACK_IMPORTED_MODULE_3__["BlockEmbed"]) {
                    return delta.insert('\n');
                }

                nextSibling = nextSibling.firstChild;
            }
        }
    }

    return delta;
}

function matchStyles(node, delta) {
    const formats = {};
    const style = node.style || {};

    if (style.fontStyle === 'italic') {
        formats.italic = true;
    }

    if (style.textDecoration === 'underline') {
        formats.underline = true;
    }

    if (style.textDecoration === 'line-through') {
        formats.strike = true;
    }

    if (style.fontWeight.startsWith('bold') || parseInt(style.fontWeight, 10) >= 700) {
        formats.bold = true;
    }

    if (Object.keys(formats).length > 0) {
        delta = applyFormat(delta, formats);
    }

    if (parseFloat(style.textIndent || 0) > 0) {
        // Could be 0.5in
        return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert('\t').concat(delta);
    }

    return delta;
}



function matchTable(node, delta) {
    const table = node.parentNode.tagName === 'TABLE' ? node.parentNode : node.parentNode.parentNode;
    console.log('table:');
    console.log(table);
    const rows = Array.from(table.querySelectorAll('tr'));
    console.log('rows:',rows);
    const tds = Array.from(table.querySelectorAll('td'));
    console.log('tds:',tds);
    const td = tds.length;
    const row = rows.indexOf(node) + 1;

    clipboardRowsCount = row; 
    clipboardCellCount = td;


    console.log('row:');
    console.log(row);
   

 

    console.log('delta:');
    console.log(delta);
    console.log('return::');
    console.log(applyFormat(delta, 'table', row));
    return applyFormat(delta, 'table', row);
}




function matchText(node, delta) {
    let text = node.data;

    // Word represents empty line with <o:p>&nbsp;</o:p>
    if (node.parentNode.tagName === 'O:P') {
        return delta.insert(text.trim());
    }

    if (text.trim().length === 0 && text.includes('\n')) {
        return delta;
    }

    if (!isPre(node)) {
        const replacer = (collapse, match) => {
            const replaced = match.replace(/[^\u00a0]/g, ''); // \u00a0 is nbsp;

            return replaced.length < 1 && collapse ? ' ' : replaced;
        };

        text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
        text = text.replace(/\s\s+/g, replacer.bind(replacer, true)); // collapse whitespace

        if (
            (node.previousSibling == null && isLine(node.parentNode)) ||
            (node.previousSibling != null && isLine(node.previousSibling))
        ) {
            text = text.replace(/^\s+/, replacer.bind(replacer, false));
        }

        if (
            (node.nextSibling == null && isLine(node.parentNode)) ||
            (node.nextSibling != null && isLine(node.nextSibling))
        ) {
            text = text.replace(/\s+$/, replacer.bind(replacer, false));
        }
    }

    return delta.insert(text);
}

//# sourceURL=webpack://Quill/./modules/clipboard.js
