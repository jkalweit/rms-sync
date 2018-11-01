"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Input = function (_SyncView) {
	_inherits(Input, _SyncView);

	function Input(options) {
		_classCallCheck(this, Input);

		var _this = _possibleConstructorReturn(this, (Input.__proto__ || Object.getPrototypeOf(Input)).call(this));

		_this.node.className = 'label-set col-nofill';
		options = options || {};
		_this.options = options;

		_this.doFlash = true;

		if (options.label) {
			SV.el('span', { parent: _this.node, innerHTML: _this.options.label, className: 'label' });
		}

		if (options.number) {
			_this.options.validator = _this.options.validator || Input.NumberValidator;
			_this.options.parser = _this.options.parser || Input.NumberParser;
			_this.options.formatter = _this.options.formatter || SV.formatCurrency;
		}

		var elem = _this.options.isTextArea ? 'textarea' : 'input';
		_this.input = SV.el(elem, { parent: _this.node,
			events: {
				focus: function focus() {
					_this.input.select();
				},
				input: function input() {
					if (_this.options.max) {
						if (_this.input.value.length > _this.options.max) {
							_this.input.value = _this.input.value.substr(0, _this.options.max);
						}
					}
				},
				blur: function blur() {
					var value = _this.input.value;
					if (_this.options.validator) {
						if (!_this.options.validator(value)) {
							alert('Invalid value: "' + value + '"');
							return;
						}
					}

					if (_this.options.parser) {
						value = _this.options.parser(value);
						if (_this.input.value !== value) {
							_this.input.value = _this.options.formatter ? _this.options.formatter(value) : value;
						}
					}
					if (_this.data && _this.data[_this.options.prop] !== value) {
						var oldValue = _this.data[_this.options.prop];
						_this.data.set(_this.options.prop, value);
						_this.emit('changed', value, oldValue);
					}
				}
			} });
		if (options.isTextArea) _this.input.style.whiteSpace = 'pre-wrap';
		if (options.number) _this.input.style.textAlign = 'right';
		if (options.datalist) _this.input.setAttribute('list', options.datalist);
		return _this;
	}

	_createClass(Input, [{
		key: 'focus',
		value: function focus() {
			this.input.focus();
		}
	}, {
		key: 'render',
		value: function render() {
			if (this.data && this.input.value !== this.data[this.options.prop]) {
				var val = this.data[this.options.prop] || '';
				this.input.value = this.options.formatter ? this.options.formatter(val) : val;
			}
		}
	}], [{
		key: 'NumberValidator',
		value: function NumberValidator(val) {
			if (typeof val === 'number') return true;
			if (val.trim() == '') return true;
			val = val.replace('$', '');
			return !isNaN(parseFloat(val));
		}
	}, {
		key: 'NumberParser',
		value: function NumberParser(val) {
			if (typeof val === 'number') return val;
			if (val.trim() == '') return 0;
			val = val.replace(',', '');
			val = val.replace('$', '');
			return parseFloat(val);
		}
	}, {
		key: 'DateValidator',
		value: function DateValidator(val) {
			if (val.trim() == '') return true;
			return moment(val, 'MM/DD/YYYY hh:mma').isValid();
		}
	}, {
		key: 'DateParser',
		value: function DateParser(val) {
			if (val.trim() == '') return null;
			console.log('value here', val);
			return moment(val, 'MM/DD/YYYY hh:mma').toISOString();
		}
	}]);

	return Input;
}(SyncView);

var List = function (_SyncView2) {
	_inherits(List, _SyncView2);

	function List(options) {
		_classCallCheck(this, List);

		var _this2 = _possibleConstructorReturn(this, (List.__proto__ || Object.getPrototypeOf(List)).call(this));

		_this2.views = {};
		_this2.ctor = options.ctor;
		_this2.sort = options.sort;
		_this2.sortDirection = options.direction;
		return _this2;
	}

	_createClass(List, [{
		key: 'render',
		value: function render() {
			var _this3 = this;

			var data = this.data || {};
			var itemsArr = SV.toArray(data, this.sort, this.sortDirection);
			var previous = null;
			itemsArr.forEach(function (item) {
				var view = _this3.views[item.key];
				if (!view) {
					view = buildComponent(_this3.ctor);
					_this3.views[item.key] = view;
					view.update(item);
					_this3.emit('viewAdded', view);
				} else {
					view.update(item);
				}
				// Attempt to preserve order
				_this3.node.insertBefore(view.node, previous ? previous.node.nextSibling : _this3.node.firstChild);
				previous = view;
			});
			Object.keys(this.views).forEach(function (key) {
				var view = _this3.views[key];
				if (!SV.getByKey(data, view.data.key)) {
					_this3.node.removeChild(view.node);
					delete _this3.views[view.data.key];
					_this3.emit('removedView', view);
				}
			});
		}
	}]);

	return List;
}(SyncView);

window.Input = Input;
window.List = List;

function isCapitalized(str) {
	return str[0] === str[0].toUpperCase();
}
function isTabbed(str) {
	return str[0] === '\t';
}

function numTabs(str) {
	var count = 0;
	for (var i = 0; i < str.length; i++) {
		if (str[i] === '\t') {
			count++;
		} else return count;
	}
	return count;
}

function getName(str) {
	var result = /(\w*)/.exec(str);
	if (result) return result[1];else return '';
}
function getBinding(str) {
	var result = /\$[(](.*?)[)]/.exec(str);
	if (result) return result[1];else return '';
}

function getId(str) {
	var result = /[#](\w*)/.exec(str);
	if (result) return result[1];else return '';
}
function getTag(str) {
	var result = /[:](\w*)/.exec(str);
	if (result) return result[1];else return '';
}
function getBetween(str, startDelimiter, endDelimiter) {
	endDelimiter = endDelimiter || startDelimiter;
	var exp = '[' + startDelimiter + '](.*?)[' + endDelimiter + ']';
	return new RegExp(exp).exec(str);
}
function getText(str) {
	var result = getBetween(str, '\'');
	if (result) return result[1];else return '';
}
function getClasses(str) {
	var result = getBetween(str, '\\[', '\\]');
	if (result) return result[1];else return '';
}

function getProp(str) {
	var result = /(\w*)[:]/.exec(str);
	if (result) return result[1].trim();else return '';
}
function getCode(str) {
	var result = /[:](.*?)/.exec(str);
	if (result) return result[1];else return '';
}

function getArgs(str) {
	var result = getBetween(str, '(', ')');
	if (result) {
		var args = result[1].split(',');
		return args.map(function (arg) {
			return arg.trim();
		});
	} else return [];
}

function getOptions(str) {
	var exp = /[^$][\(](.*?)[\)]/;
	var result = new RegExp(exp).exec(str);
	if (result) {
		return eval('(' + result[1] + ')');
	} else return {};
}

var components = {};

function findComponents(lines) {
	var currComponent;
	var inComponent = false;
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if (trimmed !== '') {
			var tabs = numTabs(line);
			if (tabs === 0 && trimmed[0] !== '#') {
				inComponent = true;
				var componentName = getName(line);
				var classes = getClasses(line);
				currComponent = {
					name: componentName,
					classes: classes,
					ctor: new Function('\n\t\t\t\t\t\t\tthis.node = SV.el(\'div\');\n\t\t\t\t\t\t\tthis.eventHandlers = {};\n\t\t\t\t\t\t\tthis.bindings = {};\n\t\t\t\t\t\t'),
					code: ''
				};

				currComponent.ctor.prototype = Object.create(SyncView.prototype);
				components[componentName] = currComponent;
			} else if (tabs !== 0 && inComponent) {
				currComponent.code += line + '\n';
			} else {
				inComponent = false;
			}
		}
	}
}

function importCode(id) {
	var code = document.getElementById(id).import.children[0].innerText;
	parse(code);
}

function importCode2(url, cb) {

    var req = new XMLHttpRequest();
    req.addEventListener('load', function() {
        console.log('here');
	    parse(this.responseText);
        console.log('here2');
        if(cb) cb();
        console.log('here4');
    });
    req.open('GET', url);
    req.send();
}

function parse(code, container) {

	container = container || document.body;

	var lines = code.split('\n');

	findComponents(lines);

	var componentInstance;
	var el;
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if (trimmed !== '') {
			var tabs = numTabs(line);
			if (tabs === 0 && trimmed[0] === '#') {
				var id = getId(trimmed);
				var componentName = getTag(trimmed);
				var classes = getClasses(trimmed);
				componentInstance = buildComponent(componentName, getOptions(trimmed));
				componentInstance.node.className += ' ' + classes;
				container.appendChild(componentInstance.node);
				window[id] = componentInstance;
			}
		}
	}
}

function buildComponent(componentName, options) {

	if (typeof componentName === 'function') {
		//args.unshift(null);
		var instance = new (Function.prototype.bind.call(componentName, this, options))();
		return instance;
	}

	var component = components[componentName];

	if (!component) {
		var ctor = window[componentName];
		//args.unshift(null);
		if (!ctor) {
			console.error('Cannot find component:', componentName);
		}
		var instance = new (Function.prototype.bind.call(ctor, this, options))();
		if (instance.init) instance.init();
		return instance;
	}

	var componentInstance = new component.ctor();
	componentInstance.options = options;
	componentInstance.node.className += ' ' + component.classes;
	var lines = component.code.split('\n');
	var el;
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if (trimmed !== '' && trimmed[0] !== '/' && trimmed[1] !== '/') {
			// ignore commented lines
			var tabs = numTabs(line);
			if (tabs === 1) {
				var id = getId(trimmed);
				var binding = getBinding(trimmed);
				var tag = getTag(trimmed) || 'div';
				var classes = getClasses(trimmed);
				var inner = getText(trimmed);
				var displayName = componentName + ':' + id + ':' + tag; // for debugger	
				if (binding) {
					var split = binding.split('=');
					var prop = 'innerHTML';
					var value = split[0];
					if (split.length > 1) {
						prop = split[0];
						value = split[1];
					}
					var existing = componentInstance.bindings[id] || {};
					existing[prop] = value;
					componentInstance.bindings[id] = existing;
				}

				if (isCapitalized(tag)) {
					var options2 = getOptions(trimmed);
					el = buildComponent(tag, options2);
					if (classes) el.node.className += ' ' + classes;
					if (id) el.node.id = id;
					componentInstance.node.appendChild(el.node);
				} else if (tag === 'function') {
					var args2 = getArgs(trimmed);
					var code = getCode(trimmed).substr(trimmed.indexOf('function') + 3, trimmed.length);
					while (i + 1 < lines.length && numTabs(lines[i + 1]) > 1) {
						i = i + 1;
						code += lines[i] + '\n';
					}
					el = new Function(args2, code).bind(componentInstance);
					Object.defineProperty(el, 'name', { value: displayName });
					el.displayName = displayName;
					//if(id === 'init') console.log('code', id, args, code);
				} else if (tag === 'events') {
					var code = getCode(trimmed);
					while (i + 1 < lines.length && numTabs(lines[i + 1]) > 1) {
						i = i + 1;
						code += lines[i] + '\n';
					}
					parseEvents(code, componentInstance.node, componentInstance, 1, displayName);
				} else if (tag === 'style') {
					var style = getCode(trimmed);
					while (i + 1 < lines.length && numTabs(lines[i + 1]) > 1) {
						i = i + 1;
						style += lines[i] + '\n';
					}
					style.replace('\n', ' ');
					var styleArr = style.split(';');
					styleArr.forEach(function (item) {
						if (item === '') return;
						var pair = item.split(':');
						pair = pair.map(function (s) {
							return s.trim();
						});
						componentInstance.node.style[pair[0]] = pair[1];
					});
				} else {

					el = SV.el(tag, {
						parent: componentInstance.node,
						id: id,
						className: classes,
						innerHTML: inner
					});
				}

				if (id) componentInstance[id] = el;
			} else if (tabs === 2) {
				var prop = getProp(trimmed);
				if (prop === 'style') {
					var style = getCode(trimmed);
					while (i + 1 < lines.length && numTabs(lines[i + 1]) > 2) {
						i = i + 1;
						style += lines[i] + '\n';
					}

					style.replace('\n', ' ');
					var styleArr = style.split(';');
					var styleObj = SyncView.isSyncView(el) ? el.node.style : el.style;
					if (!styleObj && el.node) styleObj = el.node.style;
					styleArr.forEach(function (item) {
						if (item === '') return;
						var pair = item.split(':');
						pair = pair.map(function (s) {
							return s.trim();
						});
						styleObj[pair[0]] = pair[1];
					});
				} else if (prop === 'events') {
					var code = getCode(trimmed);
					while (i + 1 < lines.length && numTabs(lines[i + 1]) > 2) {
						i = i + 1;
						code += lines[i] + '\n';
					}
					parseEvents(code, el, componentInstance, 2, displayName);
				} else if (prop === 'attributes') {
					var attr = getCode(trimmed);
					while (i + 1 < lines.length && numTabs(lines[i + 1]) > 2) {
						i = i + 1;
						attr += lines[i] + '\n';
					}
					attr.replace('\n', ' ');
					var attrArr = attr.split(';');
					attrArr.forEach(function (item) {
						if (item.trim() === '') return;
						var pair = item.split(':');
						pair = pair.map(function (s) {
							return s.trim();
						});
						el.setAttribute(pair[0], pair[1]);
					});
				}
			}
		}
	}

	if (componentInstance.init) componentInstance.init.call(componentInstance, options);

	return componentInstance;
}

function parseEvents(code, el, context, tabsBase, displayName) {
	context = context || el;
	var lines = code.split('\n');
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if (trimmed !== '') {
			var tabs = numTabs(line);
			if (tabs === tabsBase + 1) {
				var name = getName(trimmed);
				var args = getArgs(trimmed);
				var code = getCode(trimmed);
				while (i + 1 < lines.length && numTabs(lines[i + 1]) > tabsBase + 1) {
					i = i + 1;
					code += lines[i] + '\n';
				}
				var fn = new Function(args, code).bind(context);
				Object.defineProperty(fn, 'name', { value: displayName });
				fn.displayName = displayName;
				if (el.on) {
					el.on(name, fn);
				} else {
					el.addEventListener(name, fn);
				}
			}
		}
	}
}
