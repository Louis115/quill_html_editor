/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableCell", function() { return TableCell; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableRow", function() { return TableRow; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableBody", function() { return TableBody; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TableContainer", function() { return TableContainer; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "tableId", function() { return tableId; });
/* harmony import */ var _blots_block__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../blots/block */ "./blots/block.js");
/* harmony import */ var _blots_container__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../blots/container */ "./blots/container.js");




class TableCell extends _blots_block__WEBPACK_IMPORTED_MODULE_0__["default"] {


  static currentCellIndex = 0;
  static cellsARow= Number(clipboardCellCount/clipboardRowsCount);
  static clipboardRowID = null;
  

  static create(value) {
    const node = super.create();
    console.log('clipboardCellCount:',clipboardCellCount);
    console.log('clipboardRowsCount:',clipboardRowsCount);
    if (value) {
      if(typeof value === 'object'){
        console.log('second time value is an object');
        console.log('this.currentCellIndex:',this.currentCellIndex);
        console.log('this.clipboardCellCount:',this.clipboardCellCount);
        if(value['data-row'] == null && this.currentCellIndex < clipboardCellCount){
        console.log('clipboard table');
        console.log('this.cellsARow:',clipboardCellCount/clipboardRowsCount);
        console.log('this.currentCellIndex+1:',this.currentCellIndex+1);
          if(this.currentCellIndex %(clipboardCellCount/clipboardRowsCount)  === 0){
            console.log('new id');
            this.clipboardRowID = tableId();
            console.log('id:',this.clipboardRowID);
          }
          node.setAttribute('data-row', this.clipboardRowID);
          node.setAttribute('style', value['style'] ?? '');
          this.currentCellIndex ++;
          console.log(this.currentCellIndex);
          if(this.currentCellIndex == clipboardCellCount){
            this.currentCellIndex = 0;
          }
        }else{
        console.log(value);
        console.log(value['data-row']);
        node.setAttribute('data-row', value['data-row']);
        node.setAttribute('style', value['style'] ?? '');
        };
      }
      else node.setAttribute('data-row', value);
      node.setAttribute('style', value['style'] ?? '');
      
    } else {
      node.setAttribute('data-row', tableId());   // no value
    }
    
    return node;
  }

  setRowValue(row) {
    this.rowValue = row;
    console.log('Row value set in Table module:', this.rowValue);
    // Use this.rowValue in other methods where needed
  }

  static formats(domNode) {
    const formats = {};

    if (domNode.hasAttribute('data-row')) {
        formats['data-row'] = domNode.getAttribute('data-row');
    }

    if (domNode.getAttribute('style')) {
        formats['style'] = domNode.getAttribute('style');
    }
    //console.log(formats['data-row']);
    // return domNode.getAttribute('data-row');
    return formats;
}

format(name, value) {
    if (name === 'data-row' && value) {
        this.domNode.setAttribute('data-row', value);
    } else if (name === 'style' && value) {
        this.domNode.setAttribute('style', value);
    } else {
        super.format(name, value);
    }
}

  cellOffset() {
    if (this.parent) {
      return this.parent.children.indexOf(this);
    }

    return -1;
  }

  row() {
    return this.parent;
  }

  rowOffset() {
    if (this.row()) {
      return this.row().rowOffset();
    }

    return -1;
  }

  table() {
    return this.row() && this.row().table();
  }

}
export default TableCell;


TableCell.blotName = 'table';
TableCell.tagName = 'TD';





class TableRow extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {
  checkMerge() {
    if (super.checkMerge() && this.next.children.head != null) {
      const thisHead = this.children.head.formats();
      console.log("this.children");
      console.log(this.children);
      console.log("this.children.head");
      console.log(this.children.head);
      console.log("thisHead");
      console.log(thisHead);
      const thisTail = this.children.tail.formats(); //children.head/tail = TableCell >> formats() >> object : table
      const nextHead = this.next.children.head.formats();
      const nextTail = this.next.children.tail.formats();
      console.log("thisHead.table");
      console.log(thisHead.table['data-row']);
      console.log(thisTail.table['data-row']);
      console.log(nextHead.table['data-row']);
      console.log(nextTail.table['data-row']);
      console.log("flag check");
      console.log(hisHead.table['data-row'] === thisTail.table['data-row'] && thisHead.table['data-row'] === nextHead.table['data-row'] && thisHead.table['data-row'] === nextTail.table['data-row']);
      return thisHead.table['data-row'] === thisTail.table['data-row'] && thisHead.table['data-row'] === nextHead.table['data-row'] && thisHead.table['data-row'] === nextTail.table['data-row'];
    }

    return false;
  }


optimize(...args) {
    super.optimize(...args);
    this.children.forEach(child => {
        if (child.next == null) return;
        
        const childFormats = child.formats();
        const nextFormats = child.next.formats();

        // Only compare 'data-row' since 'style' is not significant
        const isSameRow = childFormats['data-row'] === nextFormats['data-row'];

        // If 'data-row' is different, we need to split
        if (!isSameRow) {
            console.log("splited due to mismatch in 'data-row'");
            const next = this.splitAfter(child);

            if (next) {
                next.optimize();
            }

            // We might be able to merge with prev now
            if (this.prev) {
                this.prev.optimize();
            }
        }
    });
}


  rowOffset() {
    if (this.parent) {
      return this.parent.children.indexOf(this);
    }

    return -1;
  }

  table() {
    return this.parent && this.parent.parent;
  }

}




TableRow.blotName = 'table-row';
TableRow.tagName = 'TR';



class TableBody extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {}

TableBody.blotName = 'table-body';
TableBody.tagName = 'TBODY';

class TableContainer extends _blots_container__WEBPACK_IMPORTED_MODULE_1__["default"] {
  balanceCells() {
    const rows = this.descendants(TableRow);
    console.log('check rows',rows);

    const maxColumns = rows.reduce((max, row) => {
      return Math.max(row.children.length, max);
    }, 0);
    rows.forEach(row => {
      new Array(maxColumns - row.children.length).fill(0).forEach(() => {
        let value;

        if (row.children.head != null) {
          value = TableCell.formats(row.children.head.domNode);
        }

        const blot = this.scroll.create(TableCell.blotName, value);
        row.appendChild(blot);
        blot.optimize(); // Add break blot
      });
    });
  }

  cells(column) {
    return this.rows().map(row => row.children.at(column));
  }

  deleteColumn(index) {
    const [body] = this.descendant(TableBody);
    if (body == null || body.children.head == null) return;
    body.children.forEach(row => {
      const cell = row.children.at(index);

      if (cell != null) {
        cell.remove();
      }
    });
  }

  insertColumn(index) {
    const [body] = this.descendant(TableBody);
    if (body == null || body.children.head == null) return;
    body.children.forEach(row => {
      const ref = row.children.at(index);
      const value = TableCell.formats(row.children.head.domNode);
      const cell = this.scroll.create(TableCell.blotName, value);
      row.insertBefore(cell, ref);
    });
  }

  insertRow(index) {
    const [body] = this.descendant(TableBody);
    if (body == null || body.children.head == null) return;
    const id = tableId();
    const row = this.scroll.create(TableRow.blotName);
    body.children.head.children.forEach(() => {
      const cell = this.scroll.create(TableCell.blotName, id);
      row.appendChild(cell);
    });
    const ref = body.children.at(index);
    body.insertBefore(row, ref);
  }

  rows() {
    const body = this.children.head;
    if (body == null) return [];
    return body.children.map(row => row);
  }

}

TableContainer.blotName = 'table-container';
TableContainer.tagName = 'TABLE';
TableContainer.allowedChildren = [TableBody];
TableBody.requiredContainer = TableContainer;
TableBody.allowedChildren = [TableRow];
TableRow.requiredContainer = TableBody;
TableRow.allowedChildren = [TableCell];
TableCell.requiredContainer = TableRow;

function tableId() {
  const id = Math.random().toString(36).slice(2, 6);
  return "row-".concat(id);
}
