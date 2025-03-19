__webpack_require__.r(__webpack_exports__);

/* harmony export (binding) */
__webpack_require__.d(__webpack_exports__, "default", function() { return Keyboard; });

/* harmony export (binding) */
__webpack_require__.d(__webpack_exports__, "SHORTKEY", function() { return SHORTKEY; });

/* harmony export (binding) */
__webpack_require__.d(__webpack_exports__, "normalize", function() { return normalize; });

/* harmony import */
var clone__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! clone */ "./node_modules/clone/clone.js");
/* harmony import */
var clone__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(clone__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */
var deep_equal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! deep-equal */ "./node_modules/deep-equal/index.js");
/* harmony import */
var deep_equal__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(deep_equal__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */
var extend__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
/* harmony import */
var extend__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */
var quill_delta__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
/* harmony import */
var quill_delta__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */
var parchment__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
/* harmony import */
var _core_quill__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../core/quill */ "./core/quill.js");
/* harmony import */
var _core_logger__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../core/logger */ "./core/logger.js");
/* harmony import */
var _core_module__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../core/module */ "./core/module.js");

const debug = Object(_core_logger__WEBPACK_IMPORTED_MODULE_6__["default"])('quill:keyboard');
const SHORTKEY = /Mac/i.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

class Keyboard extends _core_module__WEBPACK_IMPORTED_MODULE_7__["default"] {
  static match(evt, binding) {
    if (['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].some(key => {
      return !!binding[key] !== evt[key] && binding[key] !== null;
    })) {
      return false;
    }

    return binding.key === evt.key || binding.key === evt.which;
  }

  constructor(quill, options) {
    super(quill, options);
    this.bindings = {};
    Object.keys(this.options.bindings).forEach(name => {
      if (this.options.bindings[name]) {
        this.addBinding(this.options.bindings[name]);
      }
    });

    this.addBinding({ key: 'Enter', shiftKey: null }, this.handleEnter);
    this.addBinding({ key: 'Enter', metaKey: null, ctrlKey: null, altKey: null }, () => {});

    if (/Firefox/i.test(navigator.userAgent)) {
      // Need to handle delete and backspace for Firefox in the general case #1171
      this.addBinding({ key: 'Backspace' }, { collapsed: true }, this.handleBackspace);
      this.addBinding({ key: 'Delete' }, { collapsed: true }, this.handleDelete);
    } else {
      this.addBinding({ key: 'Backspace' }, { collapsed: true, prefix: /^.?$/ }, this.handleBackspace);
      this.addBinding({ key: 'Delete' }, { collapsed: true, suffix: /^.?$/ }, this.handleDelete);
    }

    this.addBinding({ key: 'Backspace' }, { collapsed: false }, this.handleDeleteRange);
    this.addBinding({ key: 'Delete' }, { collapsed: false }, this.handleDeleteRange);
    this.addBinding({
      key: 'Backspace',
      altKey: null,
      ctrlKey: null,
      metaKey: null,
      shiftKey: null
    }, {
      collapsed: true,
      offset: 0
    }, this.handleBackspace);

    this.listen();
  }

  addBinding(keyBinding, context = {}, handler = {}) {
    const binding = normalize(keyBinding);

    if (binding == null) {
      debug.warn('Attempted to add invalid keyboard binding', binding);
      return;
    }

    if (typeof context === 'function') {
      context = { handler: context };
    }

    if (typeof handler === 'function') {
      handler = { handler };
    }

    const keys = Array.isArray(binding.key) ? binding.key : [binding.key];
    keys.forEach(key => {
      const singleBinding = extend__WEBPACK_IMPORTED_MODULE_2___default()({}, binding, { key }, context, handler);
      this.bindings[singleBinding.key] = this.bindings[singleBinding.key] || [];
      this.bindings[singleBinding.key].push(singleBinding);
    });
  }

  listen() {
    this.quill.root.addEventListener('keydown', evt => {
      if (evt.defaultPrevented || evt.isComposing) return;
      const bindings = (this.bindings[evt.key] || []).concat(this.bindings[evt.which] || []);
      const matches = bindings.filter(binding => Keyboard.match(evt, binding));
      if (matches.length === 0) return;
      const range = this.quill.getSelection();
      if (range == null || !this.quill.hasFocus()) return;
      const [line, offset] = this.quill.getLine(range.index);
      const [leafStart, offsetStart] = this.quill.getLeaf(range.index);
      const [leafEnd, offsetEnd] = range.length === 0 ? [leafStart, offsetStart] : this.quill.getLeaf(range.index + range.length);
      const prefixText = leafStart instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["TextBlot"] ? leafStart.value().slice(0, offsetStart) : '';
      const suffixText = leafEnd instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["TextBlot"] ? leafEnd.value().slice(offsetEnd) : '';
      const curContext = {
        collapsed: range.length === 0,
        empty: range.length === 0 && line.length() <= 1,
        format: this.quill.getFormat(range),
        line,
        offset,
        prefix: prefixText,
        suffix: suffixText,
        event: evt
      };
      const prevented = matches.some(binding => {
        if (binding.collapsed != null && binding.collapsed !== curContext.collapsed) {
          return false;
        }

        if (binding.empty != null && binding.empty !== curContext.empty) {
          return false;
        }

        if (binding.offset != null && binding.offset !== curContext.offset) {
          return false;
        }

        if (Array.isArray(binding.format)) {
          // any format is present
          if (binding.format.every(name => curContext.format[name] == null)) {
            return false;
          }
        } else if (typeof binding.format === 'object') {
          // all formats must match
          if (!Object.keys(binding.format).every(name => {
            if (binding.format[name] === true) return curContext.format[name] != null;
            if (binding.format[name] === false) return curContext.format[name] == null;
            return deep_equal__WEBPACK_IMPORTED_MODULE_1___default()(binding.format[name], curContext.format[name]);
          })) {
            return false;
          }
        }

        if (binding.prefix != null && !binding.prefix.test(curContext.prefix)) {
          return false;
        }

        if (binding.suffix != null && !binding.suffix.test(curContext.suffix)) {
          return false;
        }

        return binding.handler.call(this, range, curContext, binding) !== true;
      });

      if (prevented) {
        evt.preventDefault();
      }
    });
  }

  handleBackspace(range, context) {
    // Check for astral symbols
    const length = /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(context.prefix) ? 2 : 1;
    if (range.index === 0 || this.quill.getLength() <= 1) return;
    let formats = {};
    const [line] = this.quill.getLine(range.index);
    let delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index - length).delete(length);

    if (context.offset === 0) {
      // Always deleting newline here, length always 1
      const [prev] = this.quill.getLine(range.index - 1);

      if (prev) {
        const curFormats = line.formats();
        const prevFormats = this.quill.getFormat(range.index - 1, 1);
        formats = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(curFormats, prevFormats) || {};

        if (Object.keys(formats).length > 0) {
          // line.length() - 1 targets \n in line, another -1 for newline being deleted
          const formatDelta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index + line.length() - 2).retain(1, formats);
          delta = delta.compose(formatDelta);
        }
      }
    }

    this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
    this.quill.focus();
  }

  handleDelete(range, context) {
    // Check for astral symbols
    const length = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(context.suffix) ? 2 : 1;
    if (range.index >= this.quill.getLength() - length) return;
    let formats = {};
    const [line] = this.quill.getLine(range.index);
    let delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).delete(length);

    if (context.offset >= line.length() - 1) {
      const [next] = this.quill.getLine(range.index + 1);

      if (next) {
        const curFormats = line.formats();
        const nextFormats = this.quill.getFormat(range.index, 1);
        formats = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(curFormats, nextFormats) || {};

        if (Object.keys(formats).length > 0) {
          delta = delta.retain(next.length() - 1).retain(1, formats);
        }
      }
    }

    this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
    this.quill.focus();
  }

  handleDeleteRange(range) {
    const lines = this.quill.getLines(range);
    let formats = {};

    if (lines.length > 1) {
      const firstFormats = lines[0].formats();
      const lastFormats = lines[lines.length - 1].formats();
      formats = quill_delta__WEBPACK_IMPORTED_MODULE_3__["AttributeMap"].diff(lastFormats, firstFormats) || {};
    }

    this.quill.deleteText(range, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);

    if (Object.keys(formats).length > 0) {
      this.quill.formatLine(range.index, 1, formats, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
    }

    this.quill.setSelection(range.index, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
    this.quill.focus();
  }

  handleEnter(range, context) {
    const lineFormats = Object.keys(context.format).reduce((formats, format) => {
      if (this.quill.scroll.query(format, parchment__WEBPACK_IMPORTED_MODULE_4__["Scope"].BLOCK) && !Array.isArray(context.format[format])) {
        formats[format] = context.format[format];
      }
      return formats;
    }, {});

    const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).delete(range.length).insert('\n', lineFormats);
    this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
    this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
    this.quill.focus();

    Object.keys(context.format).forEach(name => {
      if (lineFormats[name] != null) return;
      if (Array.isArray(context.format[name])) return;
      if (name === 'code' || name === 'link') return;
      this.quill.format(name, context.format[name], _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
    });
  }
}

Keyboard.DEFAULTS = {
  bindings: {
    bold: makeFormatHandler('bold'),
    italic: makeFormatHandler('italic'),
    underline: makeFormatHandler('underline'),
    indent: {
      // highlight tab or tab at beginning of list, indent or blockquote
      key: 'Tab',
      format: ['blockquote', 'indent', 'list'],
      handler(range, context) {
        if (context.collapsed && context.offset !== 0) return true;
        this.quill.format('indent', '+1', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        return false;
      }
    },
    outdent: {
      key: 'Tab',
      shiftKey: true,
      format: ['blockquote', 'indent', 'list'],
      // highlight tab or tab at beginning of list, indent or blockquote
      handler(range, context) {
        if (context.collapsed && context.offset !== 0) return true;
        this.quill.format('indent', '-1', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        return false;
      }
    },
    'outdent backspace': {
      key: 'Backspace',
      collapsed: true,
      shiftKey: null,
      metaKey: null,
      ctrlKey: null,
      altKey: null,
      format: ['indent', 'list'],
      offset: 0,
      handler(range, context) {
        if (context.format.indent != null) {
          this.quill.format('indent', '-1', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        } else if (context.format.list != null) {
          this.quill.format('list', false, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        }
      }
    },
    'indent code-block': makeCodeBlockHandler(true),
    'outdent code-block': makeCodeBlockHandler(false),
    'remove tab': {
      key: 'Tab',
      shiftKey: true,
      collapsed: true,
      prefix: /\t$/,
      handler(range) {
        this.quill.deleteText(range.index - 1, 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
      }
    },
    tab: {
      key: 'Tab',
      handler(range, context) {
        if (context.format.table) return true;
        this.quill.history.cutoff();
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).delete(range.length).insert('\t');
        this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        this.quill.history.cutoff();
        this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
        return false;
      }
    },
    'blockquote empty enter': {
      key: 'Enter',
      collapsed: true,
      format: ['blockquote'],
      empty: true,
      handler() {
        this.quill.format('blockquote', false, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
      }
    },
    'list empty enter': {
      key: 'Enter',
      collapsed: true,
      format: ['list'],
      empty: true,
      handler(range, context) {
        const formats = { list: false };
        if (context.format.indent) {
          formats.indent = false;
        }
        this.quill.formatLine(range.index, range.length, formats, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
      }
    },
    'checklist enter': {
      key: 'Enter',
      collapsed: true,
      format: { list: 'checked' },
      handler(range) {
        const [line, offset] = this.quill.getLine(range.index);
        const formats = extend__WEBPACK_IMPORTED_MODULE_2___default()({}, line.formats(), { list: 'checked' });
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).insert('\n', formats).retain(line.length() - offset - 1).retain(1, { list: 'unchecked' });
        this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
        this.quill.scrollIntoView();
      }
    },
    'header enter': {
      key: 'Enter',
      collapsed: true,
      format: ['header'],
      suffix: /^$/,
      handler(range, context) {
        const [line, offset] = this.quill.getLine(range.index);
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index).insert('\n', context.format).retain(line.length() - offset - 1).retain(1, { header: null });
        this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        this.quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
        this.quill.scrollIntoView();
      }
    },
    'table backspace': {
      key: 'Backspace',
      format: ['table'],
      collapsed: true,
      offset: 0,
      handler() {}
    },
    'table delete': {
      key: 'Delete',
      format: ['table'],
      collapsed: true,
      suffix: /^$/,
      handler() {}
    },
 'table enter': {
    key: 'Enter',
    shiftKey: null,
    format: ['table'],
    handler(range, context) {
        const quill = this.quill;
        const cell = context.line;

        if (cell) {
            // Insert a <br> without splitting the cell
            // Get the current content of the cell
            const currentContent = quill.getText(range.index, range.length);
            
            // Insert a <br> tag directly into the content
            quill.insertEmbed(range.index, 'text', '\n', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);

            // Set the cursor after the inserted <br>
            quill.setSelection(range.index + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
        }

        return false; // Prevent default behavior
    }
},


    'table tab': {
      key: 'Tab',
      shiftKey: null,
      format: ['table'],
      handler(range, context) {
        const { event, line: cell } = context;
        const offset = cell.offset(this.quill.scroll);
        const isLastCell = (cell.next == null) && (cell.parent.next == null);//worked 

        if (event.shiftKey) {
          this.quill.setSelection(offset - 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        } else {
          if(isLastCell){
          const newRow = table.children.tail.clone(); // Clone the last row to create a new one
          newRow.children.forEach(cell => cell.deleteAt(0, cell.length())); // Clear content in new row cells
          table.appendChild(newRow); // Add the new row to the table
  
          this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER); // Update the editor
        }
          this.quill.setSelection(offset + cell.length(), _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        }
      }
    },



    'list autofill': {
      key: ' ',
      shiftKey: null,
      collapsed: true,
      format: {
        list: false,
        'code-block': false,
        blockquote: false,
        header: false,
        table: false
      },
      prefix: /^\s*?(\d+\.|-|\*|\[ ?\]|\[x\])$/,
      handler(range, context) {
        if (this.quill.scroll.query('list') == null) return true;
        const { length } = context.prefix;
        const [line, offset] = this.quill.getLine(range.index);
        if (offset > length) return true;
        let value;

        switch (context.prefix.trim()) {
          case '[]':
          case '[ ]':
            value = 'unchecked';
            break;

          case '[x]':
            value = 'checked';
            break;

          case '-':
          case '*':
            value = 'bullet';
            break;

          default:
            value = 'ordered';
        }

        this.quill.insertText(range.index, ' ', _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        this.quill.history.cutoff();
        const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index - offset).delete(length + 1).retain(line.length() - 2 - offset).retain(1, { list: value });
        this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        this.quill.history.cutoff();
        this.quill.setSelection(range.index - length, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
        return false;
      }
    },
    'code exit': {
      key: 'Enter',
      collapsed: true,
      format: ['code-block'],
      prefix: /^$/,
      suffix: /^\s*$/,
      handler(range) {
        const [line, offset] = this.quill.getLine(range.index);
        let numLines = 2;
        let cur = line;

        while (cur != null && cur.length() <= 1 && cur.formats()['code-block']) {
          cur = cur.prev;
          numLines -= 1; // Requisite prev lines are empty
          if (numLines <= 0) {
            const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_3___default.a().retain(range.index + line.length() - offset - 2).retain(1, { 'code-block': null }).delete(1);
            this.quill.updateContents(delta, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
            this.quill.setSelection(range.index - 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
            return false;
          }
        }

        return true;
      }
    },
    'embed left': makeEmbedArrowHandler('ArrowLeft', false),
    'embed left shift': makeEmbedArrowHandler('ArrowLeft', true),
    'embed right': makeEmbedArrowHandler('ArrowRight', false),
    'embed right shift': makeEmbedArrowHandler('ArrowRight', true),
    'table down': makeTableArrowHandler(false),
    'table up': makeTableArrowHandler(true)
  }
};

function makeCodeBlockHandler(indent) {
  return {
    key: 'Tab',
    shiftKey: !indent,
    format: { 'code-block': true },
    handler(range) {
      const CodeBlock = this.quill.scroll.query('code-block');
      const lines = range.length === 0 ? this.quill.getLines(range.index, 1) : this.quill.getLines(range);
      let { index, length } = range;
      lines.forEach((line, i) => {
        if (indent) {
          line.insertAt(0, CodeBlock.TAB);

          if (i === 0) {
            index += CodeBlock.TAB.length;
          } else {
            length += CodeBlock.TAB.length;
          }
        } else if (line.domNode.textContent.startsWith(CodeBlock.TAB)) {
          line.deleteAt(0, CodeBlock.TAB.length);

          if (i === 0) {
            index -= CodeBlock.TAB.length;
          } else {
            length -= CodeBlock.TAB.length;
          }
        }
      });
      this.quill.update(_core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
      this.quill.setSelection(index, length, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.SILENT);
    }
  };
}

function makeEmbedArrowHandler(key, shiftKey) {
  const where = key === 'ArrowLeft' ? 'prefix' : 'suffix';
  return {
    key,
    shiftKey,
    altKey: null,
    [where]: /^$/,
    handler(range) {
      let { index } = range;

      if (key === 'ArrowRight') {
        index += range.length + 1;
      }

      const [leaf] = this.quill.getLeaf(index);
      if (!(leaf instanceof parchment__WEBPACK_IMPORTED_MODULE_4__["EmbedBlot"])) return true;

      if (key === 'ArrowLeft') {
        if (shiftKey) {
          this.quill.setSelection(range.index - 1, range.length + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        } else {
          this.quill.setSelection(range.index - 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        }
      } else if (shiftKey) {
        this.quill.setSelection(range.index, range.length + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
      } else {
        this.quill.setSelection(range.index + range.length + 1, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
      }

      return false;
    }
  };
}

function makeFormatHandler(format) {
  return {
    key: format[0],
    shortKey: true,
    handler(range, context) {
      this.quill.format(format, !context.format[format], _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
    }
  };
}

function makeTableArrowHandler(up) {
  return {
    key: up ? 'ArrowUp' : 'ArrowDown',
    collapsed: true,
    format: ['table'],
    handler(range, context) {
      // TODO move to table module
      const key = up ? 'prev' : 'next';
      const cell = context.line;
      const targetRow = cell.parent[key];

      if (targetRow != null) {
        if (targetRow.statics.blotName === 'table-row') {
          let targetCell = targetRow.children.head;
          let cur = cell;

          while (cur.prev != null) {
            cur = cur.prev;
            targetCell = targetCell.next;
          }

          const index = targetCell.offset(this.quill.scroll) + Math.min(context.offset, targetCell.length() - 1);
          this.quill.setSelection(index, 0, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
        }
      } else {
        const targetLine = cell.table()[key];

        if (targetLine != null) {
          if (up) {
            this.quill.setSelection(targetLine.offset(this.quill.scroll) + targetLine.length() - 1, 0, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
          } else {
            this.quill.setSelection(targetLine.offset(this.quill.scroll), 0, _core_quill__WEBPACK_IMPORTED_MODULE_5__["default"].sources.USER);
          }
        }
      }

      return false;
    }
  };
}

function normalize(binding) {
  if (typeof binding === 'string' || typeof binding === 'number') {
    binding = { key: binding };
  } else if (typeof binding === 'object') {
    binding = clone__WEBPACK_IMPORTED_MODULE_0___default()(binding, false);
  } else {
    return null;
  }

  if (binding.shortKey) {
    binding[SHORTKEY] = binding.shortKey;
    delete binding.shortKey;
  }

  return binding;
}

function tableSide(table, row, cell, offset) {
  if (row.prev == null && row.next == null) {
    if (cell.prev == null && cell.next == null) {
      return offset === 0 ? -1 : 1;
    }

    return cell.prev == null ? -1 : 1;
  }

  if (row.prev == null) {
    return -1;
  }

  if (row.next == null) {
    return 1;
  }

  return null;
}

