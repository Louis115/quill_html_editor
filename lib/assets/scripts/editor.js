eval("__webpack_require__.r(__webpack_exports__);\n");

/* Harmony imports */
var clone__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! clone */ "./node_modules/clone/clone.js");
var clone__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(clone__WEBPACK_IMPORTED_MODULE_0__);
var deep_equal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js");
var deep_equal__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(deep_equal__WEBPACK_IMPORTED_MODULE_1__);
var extend__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
var extend__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_2__);
var quill_delta__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
var quill_delta__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_3__);
var parchment__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
var _selection__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./selection */ "./core/selection.js");
var _blots_cursor__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../blots/cursor */ "./blots/cursor.js");
var _blots_block__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
var _blots_break__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../blots/break */ "./blots/break.js");
var _blots_text__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../blots/text */ "./blots/text.js");

const ASCII = /^[ -~]*$/;

class Editor {
    constructor(scroll) {
        this.scroll = scroll;
        this.delta = this.getDelta();
    }

    applyDelta(delta) {
        let consumeNextNewline = false;
        this.scroll.update();
        let scrollLength = this.scroll.length();
        this.scroll.batchStart();
        const normalizedDelta = normalizeDelta(delta);

        normalizedDelta.reduce((index, op) => {
            const length = op.retain || op.delete || (op.insert && op.insert.length) || 1;
            let attributes = op.attributes || {};

            if (op.insert != null) {
                if (typeof op.insert === 'string') {
                    let text = op.insert;
                    if (text.endsWith('\n') && consumeNextNewline) {
                        consumeNextNewline = false;
                        text = text.slice(0, -1);
                    }
                    if ((index >= scrollLength || this.scroll.descendant(_blots_block__WEBPACK_IMPORTED_MODULE_7__["BlockEmbed"], index)[0]) && !text.endsWith('\n')) {
                        consumeNextNewline = true;  
                    }
                    //when inserting a block embed, if it already properly ends with a newline, 
                    //you don't need another one right after. consumeNextNewline helps to manage this behavior.
                    this.scroll.insertAt(index, text);
                    const [line, offset] = this.scroll.line(index);
                    let formats = extend__WEBPACK_IMPORTED_MODULE_2___default()({}, Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(line));
                    if (line instanceof _blots_block__WEBPACK_IMPORTED_MODULE_7__["default"]) {
                        const [leaf] = line.descendant(parchment__WEBPACK_IMPORTED_MODULE_4__["LeafBlot"], offset);
                        formats = extend__WEBPACK_IMPORTED_MODULE_2___default()(formats, Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(leaf));
                    }
                    attributes = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(formats, attributes) || {};
                } else if (typeof op.insert === 'object') {
                    const key = Object.keys(op.insert)[0]; // There should only be one key
                    if (key == null) return index;
                    this.scroll.insertAt(index, key, op.insert[key]);
                }
                scrollLength += length;
            }

            Object.keys(attributes).forEach(name => {
                this.scroll.formatAt(index, length, name, attributes[name]);
            });
            return index + length;
        }, 0);

        normalizedDelta.reduce((index, op) => {
            if (typeof op.delete === 'number') {
                this.scroll.deleteAt(index, op.delete);
                return index;
            }
            return index + (op.retain || (op.insert && op.insert.length) || 1);
        }, 0);

        this.scroll.batchEnd();
        this.scroll.optimize();
        console.log();
        return this.update(normalizedDelta);
    }

    deleteText(index, length) {
        this.scroll.deleteAt(index, length);
        return this.update(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).delete(length));
    }

    formatLine(index, length, formats = {}) {
        this.scroll.update();
        Object.keys(formats).forEach(format => {
            this.scroll.lines(index, Math.max(length, 1)).forEach(line => {
                line.format(format, formats[format]);
            });
        });
        this.scroll.optimize();
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).retain(length, clone__WEBPACK_IMPORTED_MODULE_0___default()(formats));
        return this.update(delta);
    }

    formatText(index, length, formats = {}) {
        Object.keys(formats).forEach(format => {
            this.scroll.formatAt(index, length, format, formats[format]);
        });
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).retain(length, clone__WEBPACK_IMPORTED_MODULE_0___default()(formats));
        return this.update(delta);
    }

    getContents(index, length) {
        return this.delta.slice(index, index + length);
    }

    getDelta() {
        return this.scroll.lines().reduce((delta, line) => {
            return delta.concat(line.delta());
        }, new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a());
    }

    getFormat(index, length = 0) {
        let lines = [];
        let leaves = [];
        if (length === 0) {
            this.scroll.path(index).forEach(path => {
                const [blot] = path;
                if (blot instanceof _blots_block__WEBPACK_IMPORTED_MODULE_7__["default"]) {
                    lines.push(blot);
                } else if (blot instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["LeafBlot"]) {
                    leaves.push(blot);
                }
            });
        } else {
            lines = this.scroll.lines(index, length);
            leaves = this.scroll.descendants(parchment__WEBPACK_IMPORTED_MODULE_4__["LeafBlot"], index, length);
        }

        const formatsArr = [lines, leaves].map(blots => {
            if (blots.length === 0) return {};
            let formats = Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(blots.shift());
            while (Object.keys(formats).length > 0) {
                const blot = blots.shift();
                if (blot == null) return formats;
                formats = combineFormats(Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(blot), formats);
            }
            return formats;
        });

        return extend__WEBPACK_IMPORTED_MODULE_2___default.a.apply(extend__WEBPACK_IMPORTED_MODULE_2___default.a, formatsArr);
    }

    getHTML(index, length) {
        const [line, lineOffset] = this.scroll.line(index);
        if (line.length() >= lineOffset + length) {
            return convertHTML(line, lineOffset, length, true);
        }
        return convertHTML(this.scroll, index, length, true);
    }

    getText(index, length) {
        return this.getContents(index, length)
            .filter(op => typeof op.insert === 'string')
            .map(op => op.insert)
            .join('');
    }

    insertEmbed(index, embed, value) {
        this.scroll.insertAt(index, embed, value);
        return this.update(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).insert({ [embed]: value }));
    }

    insertText(index, text, formats = {}) {
        //not related 
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        this.scroll.insertAt(index, text);
        Object.keys(formats).forEach(format => {
            this.scroll.formatAt(index, text.length, format, formats[format]);
        });
        return this.update(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).insert(text, clone__WEBPACK_IMPORTED_MODULE_0___default()(formats)));
    }

    isBlank() {
        if (this.scroll.children.length === 0) return true;
        if (this.scroll.children.length > 1) return false;
        const block = this.scroll.children.head;
        if (block.statics.blotName !== _blots_block__WEBPACK_IMPORTED_MODULE_7__["default"].blotName) return false;
        if (block.children.length > 1) return false;
        return block.children.head instanceof _blots_break__WEBPACK_IMPORTED_MODULE_8__["default"];
    }

    removeFormat(index, length) {
        const text = this.getText(index, length);
        const [line, offset] = this.scroll.line(index + length);
        let suffixLength = 0;
        let suffix = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a();

        if (line != null) {
            suffixLength = line.length() - offset;
            suffix = line.delta().slice(offset, offset + suffixLength - 1).insert('\n');  //not related
        }

        const contents = this.getContents(index, length + suffixLength);
        const diff = contents.diff(new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().insert(text).concat(suffix));
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).concat(diff);
        return this.applyDelta(delta);
    }

    update(change, mutations = [], selectionInfo = undefined) {
        const oldDelta = this.delta;
        if (
            mutations.length === 1 &&
            mutations[0].type === 'characterData' &&
            mutations[0].target.data.match(ASCII) &&
            this.scroll.find(mutations[0].target)
        ) {
            // Optimization for character changes
            const textBlot = this.scroll.find(mutations[0].target);
            const formats = Object(_blots_block__WEBPACK_IMPORTED_MODULE_7__["bubbleFormats"])(textBlot);
            const index = textBlot.offset(this.scroll);
            const oldValue = mutations[0].oldValue.replace(_blots_cursor__WEBPACK_IMPORTED_MODULE_6__["default"].CONTENTS, '');
            const oldText = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().insert(oldValue);
            const newText = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().insert(textBlot.value());
            const relativeSelectionInfo = selectionInfo && {
                oldRange: shiftRange(selectionInfo.oldRange, -index),
                newRange: shiftRange(selectionInfo.newRange, -index),
            };
            const diffDelta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(index).concat(oldText.diff(newText, relativeSelectionInfo));
            change = diffDelta.reduce((delta, op) => {
                if (op.insert) {
                    return delta.insert(op.insert, formats);
                }
                return delta.push(op);
            }, new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a());
            this.delta = oldDelta.compose(change);
        } else {
            this.delta = this.getDelta();
            if (!change || !deep_equal__WEBPACK_IMPORTED_MODULE_1___default()(oldDelta.compose(change), this.delta)) {
                change = oldDelta.diff(this.delta, selectionInfo);
            }
        }
        return change;
    }
}

function convertListHTML(items, lastIndent, types) {
    if (items.length === 0) {
        const [endTag] = getListType(types.pop());
        if (lastIndent <= 0) {
            return `</li></${endTag}>`;
        }
        return `</li></${endTag}>${convertListHTML([], lastIndent - 1, types)}`;
    }

    const [{ child, offset, length, indent, type }, ...rest] = items;
    const [tag, attribute] = getListType(type);
    if (indent > lastIndent) {
        types.push(type);
        if (indent === lastIndent + 1) {
            return `<${tag}><li${attribute}>${convertHTML(child, offset, length)}${convertListHTML(rest, indent, types)}`;
        }
        return `<${tag}><li>${convertListHTML(items, lastIndent + 1, types)}`;
    }

    const previousType = types[types.length - 1];
    if (indent === lastIndent && type === previousType) {
        return `</li><li${attribute}>${convertHTML(child, offset, length)}${convertListHTML(rest, indent, types)}`;
    }

    const [endTag] = getListType(types.pop());
    return `</li></${endTag}>${convertListHTML(items, lastIndent - 1, types)}`;
}

function convertHTML(blot, index, length, isRoot = false) {
    if (typeof blot.html === 'function') {
        return blot.html(index, length);
    }

    if (blot instanceof _blots_text__WEBPACK_IMPORTED_MODULE_9__["default"]) {
        return Object(_blots_text__WEBPACK_IMPORTED_MODULE_9__["escapeText"])(blot.value().slice(index, index + length));
    }

    if (blot.children) {
        if (blot.statics.blotName === 'list-container') {
            const items = [];
            blot.children.forEachAt(index, length, (child, offset, childLength) => {
                const formats = child.formats();
                items.push({
                    child,
                    offset,
                    length: childLength,
                    indent: formats.indent || 0,
                    type: formats.list,
                });
            });
            return convertListHTML(items, -1, []);
        }

        const parts = [];
        blot.children.forEachAt(index, length, (child, offset, childLength) => {
            parts.push(convertHTML(child, offset, childLength));
        });

        if (isRoot || blot.statics.blotName === 'list') {
            return parts.join('');
        }

        const { outerHTML, innerHTML } = blot.domNode;
        const [start, end] = outerHTML.split(`>${innerHTML}<`);
        if (start === '<table') {
            return `<table style="border: 1px solid #000;">${parts.join('')}<${end}`;
        }

        return `${start}>${parts.join('')}<${end}`;
    }

    return blot.domNode.outerHTML;
}

function combineFormats(formats, combined) {
    return Object.keys(combined).reduce((merged, name) => {
        if (formats[name] == null) return merged;
        if (combined[name] === formats[name]) {
            merged[name] = combined[name];
        } else if (Array.isArray(combined[name])) {
            if (combined[name].indexOf(formats[name]) < 0) {
                merged[name] = combined[name].concat([formats[name]]);
            }
        } else {
            merged[name] = [combined[name], formats[name]];
        }
        return merged;
    }, {});
}

function getListType(type) {
    const tag = type === 'ordered' ? 'ol' : 'ul';
    switch (type) {
        case 'checked':
            return [tag, ' data-list="checked"'];
        case 'unchecked':
            return [tag, ' data-list="unchecked"'];
        default:
            return [tag, ''];
    }
}
// not related
function normalizeDelta(delta) {
    return delta.reduce((normalizedDelta, op) => {
        if (typeof op.insert === 'string') {
            const text = op.insert.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            return normalizedDelta.insert(text, op.attributes);
        }
        return normalizedDelta.push(op);
    }, new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a());
}

function shiftRange({ index, length }, amount) {
    return new _selection__WEBPACK_IMPORTED_MODULE_5__["Range"](index + amount, length);
}

/* harmony default export */ __webpack_exports__["default"] = (Editor);
