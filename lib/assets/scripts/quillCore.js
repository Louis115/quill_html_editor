eval("__webpack_require__.r(__webpack_exports__);\n");

__webpack_require__.d(__webpack_exports__, "globalRegistry", function() { return globalRegistry; });
__webpack_require__.d(__webpack_exports__, "expandConfig", function() { return expandConfig; });
__webpack_require__.d(__webpack_exports__, "overload", function() { return overload; });
__webpack_require__.d(__webpack_exports__, "default", function() { return Quill; });

/* Imports */
var quill_delta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! quill-delta */ "./node_modules/quill-delta/dist/Delta.js");
var quill_delta__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(quill_delta__WEBPACK_IMPORTED_MODULE_0__);
var parchment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! parchment */ "./node_modules/parchment/src/parchment.ts");
var extend__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! extend */ "./node_modules/extend/index.js");
var extend__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(extend__WEBPACK_IMPORTED_MODULE_2__);
var _editor__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./editor */ "./core/editor.js");
var _emitter__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./emitter */ "./core/emitter.js");
var _module__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./module */ "./core/module.js");
var _selection__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./selection */ "./core/selection.js");
var _instances__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./instances */ "./core/instances.js");
var _logger__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./logger */ "./core/logger.js");
var _theme__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./theme */ "./core/theme.js");

/* Debugging setup */
const debug = Object(_logger__WEBPACK_IMPORTED_MODULE_8__["default"])('quill');
const globalRegistry = new parchment__WEBPACK_IMPORTED_MODULE_1__["Registry"]();
parchment__WEBPACK_IMPORTED_MODULE_1__["ParentBlot"].uiClass = 'ql-ui';

/* Main Quill class */
class Quill {
  static debug(limit) {
    if (limit === true) {
      limit = 'log';
    }
    _logger__WEBPACK_IMPORTED_MODULE_8__["default"].level(limit);
  }

  static find(node) {
    return _instances__WEBPACK_IMPORTED_MODULE_7__["default"].get(node) || globalRegistry.find(node);
  }

  static import(name) {
    if (this.imports[name] == null) {
      debug.error(`Cannot import ${name}. Are you sure it was registered?`);
    }
    return this.imports[name];
  }

  static register(path, target, overwrite = false) {
    if (typeof path !== 'string') {
      const name = path.attrName || path.blotName;
      if (typeof name === 'string') {
        this.register(`formats/${name}`, path, target);
      } else {
        Object.keys(path).forEach(key => {
          this.register(key, path[key], target);
        });
      }
    } else {
      if (this.imports[path] != null && !overwrite) {
        debug.warn(`Overwriting ${path} with`, target);
      }
      this.imports[path] = target;
      if ((path.startsWith('blots/') || path.startsWith('formats/')) && target.blotName !== 'abstract') {
        globalRegistry.register(target);
      }
      if (typeof target.register === 'function') {
        target.register(globalRegistry);
      }
    }
  }

  constructor(container, options = {}) {
    this.options = expandConfig(container, options);
    this.container = this.options.container;

    if (this.container == null) {
      return debug.error('Invalid Quill container', container);
    }

    if (this.options.debug) {
      Quill.debug(this.options.debug);
    }

    const html = this.container.innerHTML.trim();
    this.container.classList.add('ql-container');
    this.container.innerHTML = '';
    _instances__WEBPACK_IMPORTED_MODULE_7__["default"].set(this.container, this);
    this.root = this.addContainer('ql-editor');
    this.root.classList.add('ql-blank');
    this.root.setAttribute('data-gramm', false);
    this.scrollingContainer = this.options.scrollingContainer || this.root;
    this.emitter = new _emitter__WEBPACK_IMPORTED_MODULE_4__["default"]();
    const ScrollBlot = this.options.registry.query(parchment__WEBPACK_IMPORTED_MODULE_1__["ScrollBlot"].blotName);
    this.scroll = new ScrollBlot(this.options.registry, this.root, { emitter: this.emitter });
    this.editor = new _editor__WEBPACK_IMPORTED_MODULE_3__["default"](this.scroll);
    this.selection = new _selection__WEBPACK_IMPORTED_MODULE_6__["default"](this.scroll, this.emitter);
    this.theme = new this.options.theme(this, this.options); // eslint-disable-line new-cap

    this.keyboard = this.theme.addModule('keyboard');
    this.clipboard = this.theme.addModule('clipboard');
    this.history = this.theme.addModule('history');
    this.uploader = this.theme.addModule('uploader');
    this.theme.init();
    this.emitter.on(_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.EDITOR_CHANGE, type => {
      if (type === _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.TEXT_CHANGE) {
        this.root.classList.toggle('ql-blank', this.editor.isBlank());
      }
    });
    this.emitter.on(_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.SCROLL_UPDATE, (source, mutations) => {
      const oldRange = this.selection.lastRange;
      const [newRange] = this.selection.getRange();
      const selectionInfo = oldRange && newRange ? { oldRange, newRange } : undefined;
      modify.call(this, () => this.editor.update(null, mutations, selectionInfo), source);
    });
    const contents = this.clipboard.convert({
      html: `${html}<p><br></p>`,
      text: '\\n'
    });
    this.setContents(contents);
    this.history.clear();

    if (this.options.placeholder) {
      this.root.setAttribute('data-placeholder', this.options.placeholder);
    }

    if (this.options.readOnly) {
      this.disable();
    }

    this.allowReadOnlyEdits = false;
  }

  addContainer(container, refNode = null) {
    if (typeof container === 'string') {
      const className = container;
      container = document.createElement('div');
      container.classList.add(className);
    }
    this.container.insertBefore(container, refNode);
    return container;
  }

  blur() {
    this.selection.setRange(null);
  }

  deleteText(index, length, source) {
    [index, length,, source] = overload(index, length, source);
    return modify.call(this, () => {
      return this.editor.deleteText(index, length);
    }, source, index, -1 * length);
  }

  disable() {
    this.enable(false);
  }

  editReadOnly(modifier) {
    this.allowReadOnlyEdits = true;
    const value = modifier();
    this.allowReadOnlyEdits = false;
    return value;
  }

  enable(enabled = true) {
    this.scroll.enable(enabled);
    this.container.classList.toggle('ql-disabled', !enabled);
  }

  focus() {
    const { scrollTop } = this.scrollingContainer;
    this.selection.focus();
    this.scrollingContainer.scrollTop = scrollTop;
    this.scrollIntoView();
  }

  format(name, value, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
    return modify.call(this, () => {
      const range = this.getSelection(true);
      let change = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a();
      if (range == null) return change;

      if (this.scroll.query(name, parchment__WEBPACK_IMPORTED_MODULE_1__["Scope"].BLOCK)) {
        change = this.editor.formatLine(range.index, range.length, { [name]: value });
      } else if (range.length === 0) {
        this.selection.format(name, value);
        return change;
      } else {
        change = this.editor.formatText(range.index, range.length, { [name]: value });
      }

      this.setSelection(range, _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
      return change;
    }, source);
  }

  formatLine(index, length, name, value, source) {
    let formats;
    [index, length, formats, source] = overload(index, length, name, value, source);
    return modify.call(this, () => {
      return this.editor.formatLine(index, length, formats);
    }, source, index, 0);
  }

  formatText(index, length, name, value, source) {
    let formats;
    [index, length, formats, source] = overload(index, length, name, value, source);
    return modify.call(this, () => {
      return this.editor.formatText(index, length, formats);
    }, source, index, 0);
  }

  getBounds(index, length = 0) {
    let bounds;
    if (typeof index === 'number') {
      bounds = this.selection.getBounds(index, length);
    } else {
      bounds = this.selection.getBounds(index.index, index.length);
    }
    const containerBounds = this.container.getBoundingClientRect();
    return {
      bottom: bounds.bottom - containerBounds.top,
      height: bounds.height,
      left: bounds.left - containerBounds.left,
      right: bounds.right - containerBounds.left,
      top: bounds.top - containerBounds.top,
      width: bounds.width
    };
  }

  getContents(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getContents(index, length);
  }

  getFormat(index = this.getSelection(true), length = 0) {
    if (typeof index === 'number') {
      return this.editor.getFormat(index, length);
    }
    return this.editor.getFormat(index.index, index.length);
  }

  getIndex(blot) {
    return blot.offset(this.scroll);
  }

  getLength() {
    return this.scroll.length();
  }

  getLeaf(index) {
    return this.scroll.leaf(index);
  }

  getLine(index) {
    return this.scroll.line(index);
  }

  getLines(index = 0, length = Number.MAX_VALUE) {
    if (typeof index !== 'number') {
      return this.scroll.lines(index.index, index.length);
    }
    return this.scroll.lines(index, length);
  }

  getModule(name) {
    return this.theme.modules[name];
  }

  getSelection(focus = false) {
    if (focus) this.focus();
    this.update(); // Make sure we access getRange with editor in consistent state
    return this.selection.getRange()[0];
  }

  getSemanticHTML(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getHTML(index, length);
  }

  getText(index = 0, length = this.getLength() - index) {
    [index, length] = overload(index, length);
    return this.editor.getText(index, length);
  }

  hasFocus() {
    return this.selection.hasFocus();
  }

  insertEmbed(index, embed, value, source = Quill.sources.API) {
    return modify.call(this, () => {
      return this.editor.insertEmbed(index, embed, value);
    }, source, index);
  }

  insertText(index, text, name, value, source) {
    let formats;
    [index,, formats, source] = overload(index, 0, name, value, source);
    return modify.call(this, () => {
      return this.editor.insertText(index, text, formats);
    }, source, index, text.length);
  }

  isEnabled() {
    return this.scroll.isEnabled();
  }

  off(...args) {
    return this.emitter.off(...args);
  }

  on(...args) {
    return this.emitter.on(...args);
  }

  once(...args) {
    return this.emitter.once(...args);
  }

  removeFormat(index, length, source) {
    [index, length,, source] = overload(index, length, source);
    return modify.call(this, () => {
      return this.editor.removeFormat(index, length);
    }, source, index);
  }

  scrollIntoView() {
    this.selection.scrollIntoView(this.scrollingContainer);
  }

  setContents(delta, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
    return modify.call(this, () => {
      delta = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a(delta);
      const length = this.getLength();
      const deleted = this.editor.deleteText(0, length);
      const applied = this.editor.applyDelta(delta);
      const lastOp = applied.ops[applied.ops.length - 1];

      if (lastOp != null && typeof lastOp.insert === 'string' && lastOp.insert[lastOp.insert.length - 1] === '\\n') {
        this.editor.deleteText(this.getLength() - 1, 1);
        applied.delete(1);
      }

      return deleted.compose(applied);
    }, source);
  }

  setSelection(index, length, source) {
    if (index == null) {
      this.selection.setRange(null, length || Quill.sources.API);
    } else {
      [index, length,, source] = overload(index, length, source);
      this.selection.setRange(new _selection__WEBPACK_IMPORTED_MODULE_6__["Range"](Math.max(0, index), length), source);
      if (source !== _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT) {
        this.selection.scrollIntoView(this.scrollingContainer);
      }
    }
  }

  setText(text, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
    const delta = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a().insert(text);
    return this.setContents(delta, source);
  }

  update(source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER) {
    const change = this.scroll.update(source); // Will update selection before selection.update() does if text changes
    this.selection.update(source); // TODO this is usually undefined
    return change;
  }

  updateContents(delta, source = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API) {
    return modify.call(this, () => {
      delta = new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a(delta);
      console.log('updateContents delta:',delta);
      return this.editor.applyDelta(delta, source);
      
    }, source, true);
  }
}

/* Quill Defaults and Utilities */
Quill.DEFAULTS = {
  bounds: null,
  modules: {},
  placeholder: '',
  readOnly: false,
  registry: globalRegistry,
  scrollingContainer: null,
  theme: 'default'
};
Quill.events = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events;
Quill.sources = _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources;
Quill.version = "2.0.0-dev.3";
Quill.imports = {
  delta: quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a,
  parchment: parchment__WEBPACK_IMPORTED_MODULE_1__,
  'core/module': _module__WEBPACK_IMPORTED_MODULE_5__["default"],
  'core/theme': _theme__WEBPACK_IMPORTED_MODULE_9__["default"]
};

function expandConfig(container, userConfig) {
  userConfig = extend__WEBPACK_IMPORTED_MODULE_2___default()(true, {
    container,
    modules: {
      clipboard: true,
      keyboard: true,
      history: true,
      uploader: true
    }
  }, userConfig);

  if (!userConfig.theme || userConfig.theme === Quill.DEFAULTS.theme) {
    userConfig.theme = _theme__WEBPACK_IMPORTED_MODULE_9__["default"];
  } else {
    userConfig.theme = Quill.import(`themes/${userConfig.theme}`);
    if (userConfig.theme == null) {
      throw new Error(`Invalid theme ${userConfig.theme}. Did you register it?`);
    }
  }

  const themeConfig = extend__WEBPACK_IMPORTED_MODULE_2___default()(true, {}, userConfig.theme.DEFAULTS);
  [themeConfig, userConfig].forEach(config => {
    config.modules = config.modules || {};
    Object.keys(config.modules).forEach(module => {
      if (config.modules[module] === true) {
        config.modules[module] = {};
      }
    });
  });
  
  const moduleNames = Object.keys(themeConfig.modules).concat(Object.keys(userConfig.modules));
  const moduleConfig = moduleNames.reduce((config, name) => {
    const moduleClass = Quill.import(`modules/${name}`);
    if (moduleClass == null) {
      debug.error(`Cannot load ${name} module. Are you sure you registered it?`);
    } else {
      config[name] = moduleClass.DEFAULTS || {};
    }
    return config;
  }, {});
  
  // Special case toolbar shorthand
  if (userConfig.modules != null && userConfig.modules.toolbar && userConfig.modules.toolbar.constructor !== Object) {
    userConfig.modules.toolbar = {
      container: userConfig.modules.toolbar
    };
  }

  userConfig = extend__WEBPACK_IMPORTED_MODULE_2___default()(true, {}, Quill.DEFAULTS, {
    modules: moduleConfig
  }, themeConfig, userConfig);

  ['bounds', 'container', 'scrollingContainer'].forEach(key => {
    if (typeof userConfig[key] === 'string') {
      userConfig[key] = document.querySelector(userConfig[key]);
    }
  });

  userConfig.modules = Object.keys(userConfig.modules).reduce((config, name) => {
    if (userConfig.modules[name]) {
      config[name] = userConfig.modules[name];
    }
    return config;
  }, {});

  return userConfig;
}

// Handle selection preservation and TEXT_CHANGE emission
// common to modification APIs
function modify(modifier, source, index, shift) {
  if (!this.isEnabled() && source === _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER && !this.allowReadOnlyEdits) {
    return new quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a();
  }

  let range = index == null ? null : this.getSelection();
  const oldDelta = this.editor.delta;
  const change = modifier();

  if (range != null) {
    if (index === true) {
      index = range.index; // eslint-disable-line prefer-destructuring
    }

    if (shift == null) {
      range = shiftRange(range, change, source);
    } else if (shift !== 0) {
      range = shiftRange(range, index, shift, source);
    }

    this.setSelection(range, _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT);
  }

  if (change.length() > 0) {
    const args = [_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.TEXT_CHANGE, change, oldDelta, source];
    this.emitter.emit(_emitter__WEBPACK_IMPORTED_MODULE_4__["default"].events.EDITOR_CHANGE, ...args);
    if (source !== _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.SILENT) {
      this.emitter.emit(...args);
    }
  }

  return change;
}

function overload(index, length, name, value, source) {
  let formats = {};

  if (typeof index.index === 'number' && typeof index.length === 'number') {
    // Allow for throwaway end (used by insertText/insertEmbed)
    if (typeof length !== 'number') {
      source = value;
      value = name;
      name = length;
      length = index.length; // eslint-disable-line prefer-destructuring
      index = index.index; // eslint-disable-line prefer-destructuring
    } else {
      length = index.length; // eslint-disable-line prefer-destructuring
      index = index.index; // eslint-disable-line prefer-destructuring
    }
  } else if (typeof length !== 'number') {
    source = value;
    value = name;
    name = length;
    length = 0;
  }
  
  // Handle format being object, two format name/value strings or excluded
  if (typeof name === 'object') {
    formats = name;
    source = value;
  } else if (typeof name === 'string') {
    if (value != null) {
      formats[name] = value;
    } else {
      source = name;
    }
  }
  
  // Handle optional source
  source = source || _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.API;
  return [index, length, formats, source];
}

function shiftRange(range, index, length, source) {
  if (range == null) return null;
  let start;
  let end;

  if (index instanceof quill_delta__WEBPACK_IMPORTED_MODULE_0___default.a) {
    [start, end] = [range.index, range.index + range.length].map(pos => index.transformPosition(pos, source !== _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER));
  } else {
    [start, end] = [range.index, range.index + range.length].map(pos => {
      if (pos < index || pos === index && source === _emitter__WEBPACK_IMPORTED_MODULE_4__["default"].sources.USER) return pos;

      if (length >= 0) {
        return pos + length;
      }

      return Math.max(index, pos + length);
    });
  }

  return new _selection__WEBPACK_IMPORTED_MODULE_6__["Range"](start, end - start);
}
