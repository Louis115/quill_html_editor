// Register the module with Webpack
__webpack_require__.r(__webpack_exports__);

// Harmony exports
__webpack_require__.d(__webpack_exports__, "blockDelta", function() { return blockDelta; });
__webpack_require__.d(__webpack_exports__, "bubbleFormats", function() { return bubbleFormats; });
__webpack_require__.d(__webpack_exports__, "BlockEmbed", function() { return BlockEmbed; });
__webpack_require__.d(__webpack_exports__, "default", function() { return Block; });

// Module imports
var extend__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
var extend__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_0__);

var quill_delta__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
var quill_delta__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_1__);

var parchment__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
var _break__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./break */ "./blots/break.js");
var _inline__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./inline */ "./blots/inline.js");
var _text__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./text */ "./blots/text.js");

// Constants
const NEWLINE_LENGTH = 1;

// Block Class Definition
class Block extends parchment__WEBPACK_IMPORTED_MODULE_2__["BlockBlot"] {
    constructor(scroll, domNode) {
        super(scroll, domNode);
        this.cache = {};
    }

    delta() {
        if (this.cache.delta == null) {
            this.cache.delta = blockDelta(this);
        }
        return this.cache.delta;
    }

    deleteAt(index, length) {
        super.deleteAt(index, length);
        this.cache = {};
    }

    formatAt(index, length, name, value) {
        if (length <= 0) return;

        if (this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].BLOCK)) {
            if (index + length === this.length()) {
                this.format(name, value);
            }
        } else {
            super.formatAt(index, Math.min(length, this.length() - index - 1), name, value);
        }

        this.cache = {};
    }

    insertAt(index, value, def) {
        if (def != null) {
            super.insertAt(index, value, def);
            this.cache = {};
            return;
        }
        console.log('block delta:',this.delta());
        
        let lines;
        if (value.length === 0) return;
        console.log('value to split:',value);
        if(value.endsWith('\t')){
            lines = value.split('\t');
            console.log('splited with t for tablecell');
            console.log('lines:',lines);
        }else{
            lines = value.split('\n');
            console.log('splited with n');
        }
        const text = lines.shift(); // first array cotent xxxx\t
        console.log('block text:',text);

        if (text.length > 0) {
            if (index < this.length() - 1 || this.children.tail == null) {
                super.insertAt(Math.min(index, this.length() - 1), text);
            } else {
                this.children.tail.insertAt(this.children.tail.length(), text);
            }
            this.cache = {};
        }
        console.log('block lines:',lines);
        let block = this;
        lines.reduce((lineIndex, line) => {
            block = block.split(lineIndex, true);
            console.log('block lines splited:',lines);
            block.insertAt(0, line);
            return line.length;
        }, index + text.length);
    }

    insertBefore(blot, ref) {
        const { head } = this.children;
        super.insertBefore(blot, ref);
        if (head instanceof _break__WEBPACK_IMPORTED_MODULE_3__["default"]) {
            head.remove();
        }
        this.cache = {};
    }

    length() {
        if (this.cache.length == null) {
            this.cache.length = super.length() + NEWLINE_LENGTH;
        }
        return this.cache.length;
    }

    moveChildren(target, ref) {
        super.moveChildren(target, ref);
        this.cache = {};
    }

    optimize(context) {
        super.optimize(context);
        this.cache = {};
    }

    path(index) {
        return super.path(index, true);
    }

    removeChild(child) {
        super.removeChild(child);
        this.cache = {};
    }

    split(index, force = false) {
        if (force && (index === 0 || index >= this.length() - NEWLINE_LENGTH)) {
            const clone = this.clone();
            if (index === 0) {
                this.parent.insertBefore(clone, this);
                return this;
            }
            this.parent.insertBefore(clone, this.next);
            return clone;
        }

        const next = super.split(index, force);
        this.cache = {};
        return next;
    }
}

// Block class static properties
Block.blotName = 'block';
Block.tagName = 'P';
Block.defaultChild = _break__WEBPACK_IMPORTED_MODULE_3__["default"];
Block.allowedChildren = [
    _break__WEBPACK_IMPORTED_MODULE_3__["default"],
    _inline__WEBPACK_IMPORTED_MODULE_4__["default"],
    parchment__WEBPACK_IMPORTED_MODULE_2__["EmbedBlot"],
    _text__WEBPACK_IMPORTED_MODULE_5__["default"]
];

// BlockEmbed Class Definition
class BlockEmbed extends parchment__WEBPACK_IMPORTED_MODULE_2__["EmbedBlot"] {
    attach() {
        super.attach();
        this.attributes = new parchment__WEBPACK_IMPORTED_MODULE_2__["AttributorStore"](this.domNode);
    }

    delta() {
        return new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a().insert(
            this.value(),
            extend__WEBPACK_IMPORTED_MODULE_0___default()(this.formats(), this.attributes.values())
        );
    }

    format(name, value) {
        const attribute = this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].BLOCK_ATTRIBUTE);
        if (attribute != null) {
            this.attributes.attribute(attribute, value);
        }
    }

    formatAt(index, length, name, value) {
        this.format(name, value);
    }

    insertAt(index, value, def) {   //not related
        console.log('block insertAt value',value);
        if (typeof value === 'string' && value.endsWith('\t')) {  //changed
            const block = this.scroll.create(Block.blotName);
            this.parent.insertBefore(block, index === 0 ? this : this.next);
            block.insertAt(0, value.slice(0, -1));
        } else {
            super.insertAt(index, value, def);
        }
    }
}

// BlockEmbed class static property
BlockEmbed.scope = parchment__WEBPACK_IMPORTED_MODULE_2__["Scope"].BLOCK_BLOT;

// Helper functions
function blockDelta(blot, filter = true) {
  
    return blot.descendants(parchment__WEBPACK_IMPORTED_MODULE_2__["LeafBlot"]).reduce((delta, leaf) => {
        if (leaf.length() === 0) {
            return delta;
        }
        return delta.insert(leaf.value(), bubbleFormats(leaf, {}, filter));
    }, new quill_delta__WEBPACK_IMPORTED_MODULE_1___default.a()).insert('\t', bubbleFormats(blot));  //changed
}

function bubbleFormats(blot, formats = {}, filter = true) {
    if (blot == null) return formats;

    if (typeof blot.formats === 'function') {
        formats = extend__WEBPACK_IMPORTED_MODULE_0___default()(formats, blot.formats());
        if (filter) {
            // Exclude syntax highlighting from deltas and getFormat()
            delete formats['code-token'];
        }
    }

    if (blot.parent == null || blot.parent.statics.blotName === 'scroll' || blot.parent.statics.scope !== blot.statics.scope) {
        return formats;
    }

    return bubbleFormats(blot.parent, formats, filter);
}

// Source URL
//# sourceURL=webpack://Quill/./blots/block.js?
