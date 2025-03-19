// Register the module with Webpack
__webpack_require__.r(__webpack_exports__);

// Import modules
/* harmony import */ var _attributor_attributor__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../attributor/attributor */ "./node_modules/parchment/src/attributor/attributor.ts");
/* harmony import */ var _attributor_store__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../attributor/store */ "./node_modules/parchment/src/attributor/store.ts");
/* harmony import */ var _scope__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../scope */ "./node_modules/parchment/src/scope.ts");
/* harmony import */ var _abstract_leaf__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./abstract/leaf */ "./node_modules/parchment/src/blot/abstract/leaf.ts");
/* harmony import */ var _abstract_parent__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./abstract/parent */ "./node_modules/parchment/src/blot/abstract/parent.ts");
/* harmony import */ var _inline__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./inline */ "./node_modules/parchment/src/blot/inline.ts");

// Define the BlockBlot class
class BlockBlot extends _abstract_parent__WEBPACK_IMPORTED_MODULE_4__["default"] {
    constructor(scroll, domNode) {
        super(scroll, domNode);
        this.attributes = new _attributor_store__WEBPACK_IMPORTED_MODULE_1__["default"](this.domNode);
    }

    static formats(domNode, scroll) {
        const match = scroll.query(BlockBlot.blotName);
        if (match != null && domNode.tagName === match.tagName) {
            return undefined;
        } else if (typeof this.tagName === 'string') {
            return true;
        } else if (Array.isArray(this.tagName)) {
            return domNode.tagName.toLowerCase();
        }
    }

    format(name, value) {
        const format = this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK);
        if (format == null) {
            return;
        } else if (format instanceof _attributor_attributor__WEBPACK_IMPORTED_MODULE_0__["default"]) {
            this.attributes.attribute(format, value);
        } else if (name === this.statics.blotName && !value) {
            this.replaceWith(BlockBlot.blotName);
        } else if (value && (name !== this.statics.blotName || this.formats()[name] !== value)) {
            this.replaceWith(name, value);
        }
    }

    formats() {
        const formats = this.attributes.values();
        const format = this.statics.formats(this.domNode, this.scroll);
        if (format != null) {
            formats[this.statics.blotName] = format;
        }
        return formats;
    }

    formatAt(index, length, name, value) {
        if (this.scroll.query(name, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK) != null) {
            this.format(name, value);
        } else {
            super.formatAt(index, length, name, value);
        }
    }

    insertAt(index, value, def) {
        if (def == null || this.scroll.query(value, _scope__WEBPACK_IMPORTED_MODULE_2__["default"].INLINE) != null) {
            // Insert text or inline
            super.insertAt(index, value, def);
        } else {
            const after = this.split(index);
            if (after != null) {
                const blot = this.scroll.create(value, def);
                after.parent.insertBefore(blot, after);
            } else {
                throw new Error('Attempt to insertAt after block boundaries');
            }
        }
    }

    replaceWith(name, value) {
        const replacement = super.replaceWith(name, value);
        this.attributes.copy(replacement);
        return replacement;
    }

    update(mutations, context) {
        super.update(mutations, context);
        const attributeChanged = mutations.some(
            (mutation) => mutation.target === this.domNode && mutation.type === 'attributes'
        );
        if (attributeChanged) {
            this.attributes.build();
        }
    }
}

// Static properties of BlockBlot
BlockBlot.blotName = 'block';
BlockBlot.scope = _scope__WEBPACK_IMPORTED_MODULE_2__["default"].BLOCK_BLOT;
BlockBlot.tagName = 'P';
BlockBlot.allowedChildren = [
    _inline__WEBPACK_IMPORTED_MODULE_5__["default"],
    BlockBlot,
    _abstract_leaf__WEBPACK_IMPORTED_MODULE_3__["default"],
];

/* harmony default export */ __webpack_exports__["default"] = (BlockBlot);

//# sourceURL=webpack://Quill/./node_modules/parchment/src/blot/block.ts?
