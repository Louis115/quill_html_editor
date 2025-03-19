// Register the module with Webpack
__webpack_require__.r(__webpack_exports__);

// Import modules
/* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
/* harmony import */ var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _core_quill__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
/* harmony import */ var _core_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/module */ "./core/module.js");
/* harmony import */ var _formats_table__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../formats/table */ "./formats/table.js");


// Define the Table class
class Table extends _core_module__WEBPACK_IMPORTED_MODULE_2__["default"] {
    static register() {
        _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableCell"]);
        _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableRow"]);
        _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableBody"]);
        _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].register(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableContainer"]);
    }

    constructor(...args) {
        super(...args);
        this.listenBalanceCells();
    }

    balanceTables() {
        this.quill.scroll.descendants(_formats_table__WEBPACK_IMPORTED_MODULE_3__["TableContainer"]).forEach(table => {
            table.balanceCells();
        });
    }

    deleteColumn() {
        const [table, , cell] = this.getTable();
        if (cell == null) return;
        table.deleteColumn(cell.cellOffset());
        this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
    }

    deleteRow() {
        const [, row] = this.getTable();
        if (row == null) return;
        row.remove();
        this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
    }

    deleteTable() {
        const [table] = this.getTable();
        if (table == null) return;
        const offset = table.offset();
        table.remove();
        this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
        this.quill.setSelection(offset, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
    }

    getTable(range = this.quill.getSelection()) {
        if (range == null) return [null, null, null, -1];
        const [cell, offset] = this.quill.getLine(range.index);

        if (cell == null || cell.statics.blotName !== _formats_table__WEBPACK_IMPORTED_MODULE_3__["TableCell"].blotName) {
            return [null, null, null, -1];
        }

        const row = cell.parent;
        const table = row.parent.parent;
        return [table, row, cell, offset];
    }

    insertColumn(offset) {
        const range = this.quill.getSelection();
        const [table, row, cell] = this.getTable(range);
        if (cell == null) return;
        const column = cell.cellOffset();
        table.insertColumn(column + offset);
        this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);
        let shift = row.rowOffset();

        if (offset === 0) {
            shift += 1;
        }

        this.quill.setSelection(range.index + shift, range.length, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
    }

    insertColumnLeft() {
        this.insertColumn(0);
    }

    insertColumnRight() {
        this.insertColumn(1);
    }

    insertRow(offset) {
        const range = this.quill.getSelection();
        const [table, row, cell] = this.getTable(range);
        if (cell == null) return;
        const index = row.rowOffset();
        table.insertRow(index + offset);
        this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);

        if (offset > 0) {
            this.quill.setSelection(range, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
        } else {
            this.quill.setSelection(range.index + row.children.length, range.length, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
        }
    }

    insertRowAbove() {
        this.insertRow(0);
    }

    insertRowBelow() {
        this.insertRow(1);
    }

    insertTable(rows, columns) {
        const range = this.quill.getSelection();
        if (range == null) return;
        const delta = new Array(rows).fill(0).reduce(memo => {
            const text = new Array(columns).fill('\t').join('');
            console.log('text:',text);
            console.log("memo:",memo.insert(text, {table: Object(_formats_table__WEBPACK_IMPORTED_MODULE_3__["tableId"])()}));
            return memo.insert(text, {
                table: Object(_formats_table__WEBPACK_IMPORTED_MODULE_3__["tableId"])()
            });
        }, new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().retain(range.index));
        console.log("module delta:",delta);
        this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER);  // Each pair of newlines (\n\n) will be treated as a separate row in the table like row-wdxw and row-vpd7
        this.quill.setSelection(range.index, _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.SILENT);
        this.balanceTables();
    }

    listenBalanceCells() {
        this.quill.on(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].events.SCROLL_OPTIMIZE, mutations => {
            mutations.some(mutation => {
                if (['TD', 'TR', 'TBODY', 'TABLE'].includes(mutation.target.tagName)) {
                    this.quill.once(_core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].events.TEXT_CHANGE, (delta, old, source) => {
                        if (source !== _core_quill__WEBPACK_IMPORTED_MODULE_1__["default"].sources.USER) return;
                        this.balanceTables();
                    });
                    return true;
                }
                return false;
            });
        });
    }
}

/* harmony default export */ __webpack_exports__["default"] = (Table);

//# sourceURL=webpack://Quill/./modules/table.js?
