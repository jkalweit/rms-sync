"use strict";

// Fix for Facebook authentication to remove hash

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

if (window.location.hash == '#_=_') {
	history.replaceState ? history.replaceState(null, null, window.location.href.split('#')[0]) : window.location.hash = '';
}

var RMS = function () {
	function RMS(sync) {
		var _this = this;

		_classCallCheck(this, RMS);

		this.sync = sync;
		this.sync.on('updated', function (data) {
			_this.data = data;
		});
		this.pinRequests = {};
		console.log('here3333333333');
		io().on('verify admin pin result', function (key, result) {
			console.log('safsdafas222233333');
			var request = _this.pinRequests[key];
			if (!request) return;
			delete _this.pinRequests[key];
			if (request.callback) {
				request.callback(result);
			}
		});
	}

	_createClass(RMS, [{
		key: 'verifyAdminPin',
		value: function verifyAdminPin(pin, callback) {
			var request = {
				key: SyncNode.guidShort(),
				callback: callback
			};
			this.pinRequests[request.key] = request;
			io().emit('verify admin pin', pin, request.key);
		}
	}, {
		key: 'createCredit',
		value: function createCredit(type) {
			var code = SV.generateCode(4);
			if (!this.data.credits) this.data.set('credits', {});
			while (this.data.credits[code]) {
				code = SV.generateCode(4);
			} // Make sure code is unique
			var credit = {
				key: code,
				addedAt: new Date().toISOString(),
				addedBy: '',
				memberKey: '',
				type: type,
				note: '',
				amount: 0,
				balance: 0,
				history: {}
			};
			return credit;
		}
	}]);

	return RMS;
}();

var SV = function () {
	function SV() {
		_classCallCheck(this, SV);
	}

	_createClass(SV, null, [{
		key: 'id',
		value: function (_id) {
			function id(_x, _x2) {
				return _id.apply(this, arguments);
			}

			id.toString = function () {
				return _id.toString();
			};

			return id;
		}(function (id, context) {
			context = context || document;
			return context.getElementById(id);
		})
	}, {
		key: 'getProperty',
		value: function getProperty(obj, path) {
			if (!path) return obj;
			return SV.getPropertyHelper(obj, path.split('.'));
		}
	}, {
		key: 'getPropertyHelper',
		value: function getPropertyHelper(obj, split) {
			if (split.length === 1) return obj[split[0]];
			if (obj == null) return null;
			return SV.getPropertyHelper(obj[split[0]], split.slice(1, split.length));
		}
	}, {
		key: 'inject',
		value: function inject(template, data) {
			template = template.replace(/checked="{{([\w\.]*)}}"/g, function (m, key) {
				return SV.getProperty(data, key) ? 'checked' : '';
			});

			return template.replace(/{{([\w\.]*)}}/g, function (m, key) {
				return SV.getProperty(data, key);
			});
		}
	}, {
		key: 'mergeMap',
		value: function mergeMap(source, destination) {
			Object.keys(source).forEach(function (key) {
				destination[key] = source[key];
			});
		}
	}, {
		key: 'normalize',
		value: function normalize(str) {
			return (str || '').trim().toLowerCase();
		}
	}, {
		key: 'generateCode',
		value: function generateCode(length) {
			var code = '';
			var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
			for (var i = 0; i < length; i++) {
				code += chars[Math.floor(Math.random() * chars.length)];
			}
			return code;
		}
	}, {
		key: 'createElement',
		value: function createElement(name) {
			var proto = Object.create(HTMLElement.prototype);
			proto.template = id(name);
			var ctor = document.registerElement(name, {
				prototype: proto
			});

			return function (data) {
				var element = new ctor();
				element.data = data;
				return element;
			};
		}
	}, {
		key: 'toMap',
		value: function toMap(arr, keyValFunc) {
			keyValFunc = keyValFunc || function (obj) {
				return obj.key;
			};
			if (typeof arr !== 'array') return arr;
			var result = {};
			var curr;
			for (var i = 0; i < arr.length; i++) {
				curr = arr[i];
				result[keyValFunc(curr)] = curr;
			}
			return result;
		}
	}, {
		key: 'sortMap',
		value: function sortMap(obj, sortField, reverse, keyValFunc) {
			return SV.toMap(SV.toArray(obj, sortField, reverse), keyValFunc);
		}
	}, {
		key: 'toArray',
		value: function toArray(obj, sortField, reverse) {
			var result;
			if (Array.isArray(obj)) {
				result = obj.slice();
			} else {
				result = [];
				if (!obj) return result;
				Object.keys(obj).forEach(function (key) {
					if (key !== 'version' && key !== 'lastModified' && key !== 'key') {
						result.push(obj[key]);
					}
				});
			}

			if (sortField) {
				var getSortValue;
				if (typeof sortField === 'function') getSortValue = sortField;else getSortValue = function getSortValue(obj) {
					return SV.getProperty(obj, sortField);
				};
				result.sort(function (a, b) {
					var a1 = getSortValue(a);
					var b1 = getSortValue(b);
					if (typeof a1 === 'string') a1 = a1.toLowerCase();
					if (typeof b1 === 'string') b1 = b1.toLowerCase();
					if (a1 < b1) return reverse ? 1 : -1;
					if (a1 > b1) return reverse ? -1 : 1;
					return 0;
				});
			}
			return result;
		}
	}, {
		key: 'forEach',
		value: function forEach(obj, func) {
			if (typeof obj !== 'array') {
				obj = SV.toArray(obj);
			}
			obj.forEach(function (val) {
				return func(val);
			});
		}
	}, {
		key: 'getByKey',
		value: function getByKey(obj, key) {
			if (Array.isArray(obj)) {
				for (var i = 0; i < obj.length; i++) {
					if (obj[i].key === key) return obj[i];
				}
			} else {
				return obj[key];
			}
		}
	}, {
		key: 'findFirst',
		value: function findFirst(obj, func) {
			var arr = SV.toArray(obj);
			var curr;
			for (var i = 0; i < arr.length; i++) {
				curr = arr[i];
				if (func(curr)) return curr;
			}
			return null;
		}

		// for debugging, receive reload signals from server when source files change

	}, {
		key: 'startReloader',
		value: function startReloader() {
			io().on('reload', function () {
				console.log('               reload!!!!');
				location.reload();
			});
		}
	}, {
		key: 'param',
		value: function param(variable) {
			var query = window.location.search.substring(1);
			var vars = query.split("&");
			for (var i = 0; i < vars.length; i++) {
				var pair = vars[i].split("=");
				if (pair[0] == variable) {
					return pair[1];
				}
			}
			return false;
		}
	}, {
		key: 'updateViews',
		value: function updateViews(parent, views, ctor, items, itemsArr) {
			itemsArr = itemsArr || SV.toArray(items);
			itemsArr.forEach(function (item) {
				var view = views[item.key];
				if (!view) {
					view = new ctor();
					views[item.key] = view;
					parent.appendChild(view.node);
				}
				view.update(item);
			});
			Object.keys(views).forEach(function (key) {
				var view = views[key];
				if (!items[view.data.key]) {
					parent.removeChild(view.node);
					delete views[view.data.key];
				}
			});
		}
	}, {
		key: 'el',
		value: function el(name, opts) {
			opts = opts || {};
			var elem = document.createElement(name);
			Object.keys(opts).forEach(function (key) {
				if (key !== 'events' && key !== 'style' && key !== 'attributes') {
					elem[key] = opts[key];
				}
			});
			if (opts.events) {
				Object.keys(opts.events).forEach(function (key) {
					elem.addEventListener(key, opts.events[key]);
				});
			}
			if (opts.style) {
				Object.keys(opts.style).forEach(function (key) {
					elem.style[key] = opts.style[key];
				});
			}
			if (opts.attributes) {
				Object.keys(opts.attributes).forEach(function (key) {
					elem.setAttribute(key, opts.attributes[key]);
				});
			}
			if (opts.parent) opts.parent.appendChild(elem);
			return elem;
		}
	}, {
		key: 'onLoad',
		value: function onLoad(callback) {
			window.addEventListener('load', function (e) {
				callback(e);
			});
		}
	}, {
		key: 'group',
		value: function group(arr, prop, groupVals) {
			var groups = {};

			if (typeof groupVals === 'array') {
				groupVals.forEach(function (groupVal) {
					groups[groupVal] = { key: groupVal };
				});
			}

			if (!Array.isArray(arr)) arr = SV.toArray(arr);

			arr.forEach(function (item) {
				var val;
				if (typeof prop === 'function') {
					val = prop(item);
				} else {
					val = item[prop];
				}

				if (!groups[val]) groups[val] = { key: val };
				groups[val][item.key] = item;
			});

			return groups;
		}
	}, {
		key: 'getDayOfWeek',
		value: function getDayOfWeek(day, mdate) {
			mdate = mdate || moment();
			var sunday = mdate.startOf('day').subtract(mdate.day(), 'day');
			return sunday.add(day, 'day');
		}
	}, {
		key: 'filterMap',
		value: function filterMap(map, filterFn) {
			var result = {};
			map = map || {};
			Object.keys(map).forEach(function (key) {
				if (key !== 'version' && key !== 'key' && key !== 'lastModified' && filterFn(map[key])) {
					result[key] = map[key];
				}
			});
			return result;
		}
	}, {
		key: 'arrayContains',
		value: function arrayContains(list, value) {
			for (var i = 0; i < list.length; ++i) {
				if (list[i] === value) return true;
			}
			return false;
		}
	}, {
		key: 'flash',
		value: function flash(elem) {
			elem.classList.add('flash');
			setTimeout(function () {
				elem.classList.remove('flash');
			}, 500);
		}
	}, {
		key: 'removeCrap',
		value: function removeCrap(doc) {
			if ((typeof doc === 'undefined' ? 'undefined' : _typeof(doc)) !== 'object') return doc;
			console.log('doc', doc);
			Object.keys(doc).forEach(function (key) {
				console.log('key', key);
				if (key === 'version' || key === 'key' || key === 'serveType' || key === 'modifiers' || key === 'addedAt' || key === 'addedBy' || key === 'isAlcohol' || key === 'taxType' || key === 'options') {
					console.log('deleting', key);
					delete doc[key];
				} else {
					console.log('continuuing', key);
					doc[key] = SV.removeCrap(doc[key]);
				}
			});
			return doc;
		}
	}, {
		key: 'printReceipt',
		value: function printReceipt(receipt, printer) {
			var small = SV.removeCrap(receipt);
			console.log('Small', printer, small);
			var itemsArr = SV.toArray(small.orderItems, 'name');
			var itemsSorted = {};
			var key = 0;
			itemsArr.forEach(function (item) {
				itemsSorted[key++] = item;
			});
			small.orderItems = itemsSorted;
			console.log('Small Sorted2', printer, small);
			io().emit('print receipt', small, printer);
		}
	}, {
		key: 'printKitchen',
		value: function printKitchen(kitchenOrder, printer) {
			io().emit('print kitchen', kitchenOrder, printer);
		}
	}, {
		key: 'printRec',
		value: function printRec(rec, printer) {
			console.log('printing rec', printer);
			io().emit('print reconciliation receipt', rec, printer);
			var f = SV.formatCurrency;
			var message = name + '\nFood: ' + f(rec.sales.food) + '\nTax: ' + f(rec.sales.tax) + '\nAlcohol: ' + f(rec.sales.alcohol) + '\nTotal: ' + f(rec.sales.total) + '\nDiff: ' + f(rec.difference);
			console.log('message', message);
			SV.sendToAdmin(message);
		}
	}, {
		key: 'playKitchenBell',
		value: function playKitchenBell() {
			io().emit('play kitchen bell');
		}
	}, {
		key: 'chargeCreditCard',
		value: function chargeCreditCard(values) {
			io().emit('charge credit card', values);
		}
	}, {
		key: 'sendText',
		value: function sendText(msg) {
			io().emit('send text', msg);
		}
	}, {
		key: 'sendToAdmin',
		value: function sendToAdmin(body) {
			io().emit('send text to admin', body);
		}
	}, {
		key: 'sendEmailFromAdmin',
		value: function sendEmailFromAdmin(msg) {
			io().emit('send email from admin', msg);
		}
	}, {
		key: 'normalizePhone',
		value: function normalizePhone(phone) {
			return phone.replace('-', '').replace('(', '').replace(')', '').replace('.', '').replace(' ', '').toLowerCase();
		}
	}, {
		key: 'formatCurrency',
		value: function formatCurrency(value, precision) {
			if (value === '') value = 0;
			precision = typeof precision === 'number' ? precision : 2;
			var number = typeof value === 'string' ? parseFloat(value) : value;
			if (value == null) {
				return '';
			}
			return SV.numberWithCommas(number.toFixed(precision).toString());
		}
	}, {
		key: 'formatTime',
		value: function formatTime(value) {
			if (!value) return '';
			return moment(value).format('h:mma');
		}
	}, {
		key: 'formatDate',
		value: function formatDate(value) {
			if (!value) return '';
			return moment(value).format('MM/DD/YYYY hh:mma');
		}
	}, {
		key: 'durationAsHours',
		value: function durationAsHours(start, stop) {
			if (!start || !stop) return '';
			var dur = moment.duration(moment(stop).diff(moment(start)));
			return Math.round(dur.asHours() * 100) / 100;
		}
	}, {
		key: 'numberWithCommas',
		value: function numberWithCommas(n) {
			var parts = n.toString().split(".");
			return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
		}
	}, {
		key: 'round',
		value: function round(value, precision) {
			return parseFloat(value.toFixed(precision || 2));
		}
	}, {
		key: 'iconButton',
		value: function iconButton(icon, options) {
			var button = SV.el('div', options);
			button.classList.add('btn');
			button.classList.add('btn-big');
			button.innerHTML = '<i class="material-icons">' + icon + '</i>' + button.innerHTML;
			return button;
		}
	}, {
		key: 'substr',
		value: function substr(str, char) {
			var pos = str.indexOf(char);
			if (pos !== -1) {
				return str.substr(0, pos);
			} else return str;
		}
	}, {
		key: 'isValidEmail',
		value: function isValidEmail(email) {
			var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
			return re.test(email);
		}
	}, {
		key: 'isEmptyObject',
		value: function isEmptyObject(obj) {
			return Object.keys(obj).length === 0;
		}
	}]);

	return SV;
}();

var SyncView = function () {
	function SyncView(content) {
		_classCallCheck(this, SyncView);

		if (content instanceof HTMLElement) {
			this.node = content;
		} else {
			this.node = SV.el('div', { innerHTML: content || '' });
		}
		this.eventHandlers = {};
		this.bindings = {};
	}

	_createClass(SyncView, [{
		key: 'appendView',
		value: function appendView(syncview, parent) {
			(parent || this.node).appendChild(syncview.node);
			return syncview;
		}
	}, {
		key: 'update',
		value: function update(data, force) {
			if (force || this.hasChanged(data)) {
				//this.lastModified = data.lastModified;
				this.currentVersion = data ? data.version : null;
				//var oldData = this.data;
				this.data = data;
				this.emit('updating', data); //, oldData);
				this.bind();
				if (this.render) this.render(force);
				if (this.doFlash) this.flash();
			} else {
				// if (this.name) console.log(this.name + ' DATA NO CHANGED', this, this.data, data);
			}
		}
	}, {
		key: 'bind',
		value: function bind() {
			var _this2 = this;

			function traverse(curr, pathArr) {
				if (pathArr.length === 0) return curr;else {
					var next = pathArr.shift();
					if (curr == null || !curr.hasOwnProperty(next)) return null;
					return traverse(curr[next], pathArr);
				}
			}

			Object.keys(this.bindings).forEach(function (id) {
				var props = _this2.bindings[id];
				Object.keys(props).forEach(function (prop) {
					var valuePath = props[prop];
					var value = traverse(_this2, valuePath.split('.'));
					if (prop === 'update') {
						_this2[id].update(value);
					} else {
						_this2[id][prop] = value;
					}
				});
			});
		}
	}, {
		key: 'hasChanged',
		value: function hasChanged(newData) {

			// if(this.name) console.log(this.name + ' doing hasChanged #########################');
			if (!this.data && !newData) {
				if (this.name) console.log(this.name + 'here1 both are null');
				return false;
			}
			if (this.data && !newData || !this.data && newData) {
				// 	if(this.name) console.log(this.name + 'here2');
				return true;
			}

			if (this.currentVersion && newData.version) {
				//console.log('checking version #################', this.currentVersion, newData.version);
				return this.currentVersion !== newData.version;
			}

			//		console.log('defaulting to true #################', this.data !== newData, this.currentVersion, newData);
			return true;

			// if((typeof this.data !== 'object') && (typeof newData !== 'object')) {
			// 	console.log('direct comparison', this.data, newData);
			// 	return this.data === newData;
			// }
			// if(!this.data.lastModified || !newData.lastModified) {
			// 	if(this.name) console.log(this.name + 'here3');
			// 	return true;
			// }	
			// if(this.name) console.log(this.name + 'here4', this.lastModified, newData.lastModified);
			// if(this.name) console.log(this.name + 'here5', this.currentVersion, newData.version);
			// return (this.data.version !== newData.version) || (this.currentVersion != newData.version);
			// return this.lastModified !== newData.lastModified;
		}
	}, {
		key: 'on',
		value: function on(eventName, handler) {
			if (!this.eventHandlers[eventName]) this.eventHandlers[eventName] = [];
			this.eventHandlers[eventName].push(handler);
		}
	}, {
		key: 'emit',
		value: function emit(eventName) {
			var handlers = this.eventHandlers[eventName] || [];
			var args = new Array(arguments.length - 1);
			for (var i = 1; i < arguments.length; ++i) {
				args[i - 1] = arguments[i];
			}
			handlers.forEach(function (handler) {
				handler.apply(null, args);
			});
		}
	}, {
		key: 'flash',
		value: function flash() {
			// to visualize changes for debugging
			SV.flash(this.node);
		}
	}], [{
		key: 'updateViews',
		value: function updateViews(views, data) {
			views.forEach(function (view) {
				view.update(data);
			});
		}
	}, {
		key: 'isSyncView',
		value: function isSyncView(val) {
			if (!SyncNode.isObject(val)) return false;
			var className = val.constructor.toString().match(/\w+/g)[1];
			return className === 'SyncView';
		}
	}]);

	return SyncView;
}();

var ViewsContainer = function (_SyncView) {
	_inherits(ViewsContainer, _SyncView);

	function ViewsContainer(ctor, sort, direction, element) {
		_classCallCheck(this, ViewsContainer);

		var _this3 = _possibleConstructorReturn(this, (ViewsContainer.__proto__ || Object.getPrototypeOf(ViewsContainer)).call(this, element));

		_this3.views = {};
		_this3.ctor = ctor;
		_this3.sort = sort;
		_this3.sortDirection = direction;
		return _this3;
	}

	_createClass(ViewsContainer, [{
		key: 'render',
		value: function render(force) {
			var _this4 = this;

			var itemsArr = SV.toArray(this.data, this.sort, this.sortDirection);
			var previous = null;
			itemsArr.forEach(function (item) {
				var view = _this4.views[item.key];
				if (!view) {
					view = new _this4.ctor();
					_this4.views[item.key] = view;
					// Attempt to preserve order
					_this4.node.insertBefore(view.node, previous ? previous.node.nextSibling : _this4.node.firstChild);
					view.update(item, force);
					_this4.emit('viewAdded', view);
				} else {
					view.update(item, force);
				}
				previous = view;
			});
			Object.keys(this.views).forEach(function (key) {
				var view = _this4.views[key];
				if (!SV.getByKey(_this4.data, view.data.key)) {
					_this4.node.removeChild(view.node);
					delete _this4.views[view.data.key];
					_this4.emit('removedView', view);
				}
			});
		}
	}]);

	return ViewsContainer;
}(SyncView);

var SimpleEditInput = function (_SyncView2) {
	_inherits(SimpleEditInput, _SyncView2);

	function SimpleEditInput(prop, label, options) {
		_classCallCheck(this, SimpleEditInput);

		var _this5 = _possibleConstructorReturn(this, (SimpleEditInput.__proto__ || Object.getPrototypeOf(SimpleEditInput)).call(this));

		_this5.node.className = 'label-set';
		_this5.options = options || {};

		_this5.doFlash = true;

		_this5.prop = prop;

		if (label) {
			SV.el('span', { parent: _this5.node, innerHTML: label, className: 'label' });
		}

		var elem = _this5.options.isTextArea ? 'textarea' : 'input';
		_this5.input = SV.el(elem, { parent: _this5.node,
			events: {
				blur: function blur() {
					var value = _this5.input.value;
					if (_this5.options.validator && !_this5.options.validator(value)) {
						alert('Invalid value: "' + value + '"');
						return;
					}

					if (_this5.options.parser) value = _this5.options.parser(value);
					if (_this5.data[_this5.prop] !== value) {
						var oldValue = _this5.data[_this5.prop];
						//var update = {};
						//update[this.prop] = value;
						_this5.data.set(_this5.prop, value);
						_this5.emit('changed', value, oldValue);
					}
				}
			} });
		return _this5;
	}

	_createClass(SimpleEditInput, [{
		key: 'focus',
		value: function focus() {
			this.input.focus();
		}
	}, {
		key: 'render',
		value: function render() {
			if (this.data && this.input.value !== this.data[this.prop]) {
				var val = this.data[this.prop] || '';
				this.input.value = this.options.formatter ? this.options.formatter(val) : val;
			}
		}
	}], [{
		key: 'NumberValidator',
		value: function NumberValidator(val) {
			if (typeof val === 'number') return true;
			if (val.trim() == '') return true;
			return !isNaN(parseFloat(val));
		}
	}, {
		key: 'NumberParser',
		value: function NumberParser(val) {
			if (typeof val === 'number') return val;
			if (val.trim() == '') return 0;
			return parseFloat(val);
		}
	}]);

	return SimpleEditInput;
}(SyncView);

var EditInput = function (_SyncView3) {
	_inherits(EditInput, _SyncView3);

	function EditInput(display, prop, inputStyle, emptyText) {
		_classCallCheck(this, EditInput);

		var _this6 = _possibleConstructorReturn(this, (EditInput.__proto__ || Object.getPrototypeOf(EditInput)).call(this));

		_this6.prop = prop;

		_this6.mainView = SV.el('div', { parent: _this6.node,
			events: { click: function click() {
					_this6.isEditing = true;
					_this6.render();
					_this6.input.focus();
				} } });
		_this6.display = display;
		_this6.mainView.appendChild(_this6.display);

		_this6.editView = SV.el('div', { parent: _this6.node });
		_this6.input = SV.el('input', { parent: _this6.editView,
			events: { blur: function blur() {
					_this6.data.set(_this6.prop, _this6.input.value);
					_this6.isEditing = false;
					_this6.render();
				} } });
		SV.mergeMap(inputStyle || {}, _this6.input.style);
		//this.input.style.width = 'calc(100% - 50px)';
		_this6.emptyText = emptyText;
		_this6.isEditing = false;
		return _this6;
	}

	_createClass(EditInput, [{
		key: 'render',
		value: function render() {
			this.input.value = this.data[this.prop];
			this.mainView.style.display = !this.isEditing ? 'block' : 'none';
			this.editView.style.display = this.isEditing ? 'block' : 'none';
			this.display.innerHTML = this.data[this.prop] || this.emptyText || '';
		}
	}]);

	return EditInput;
}(SyncView);

var SimpleEditCheckBox = function (_SyncView4) {
	_inherits(SimpleEditCheckBox, _SyncView4);

	function SimpleEditCheckBox(prop, label) {
		_classCallCheck(this, SimpleEditCheckBox);

		var _this7 = _possibleConstructorReturn(this, (SimpleEditCheckBox.__proto__ || Object.getPrototypeOf(SimpleEditCheckBox)).call(this));

		_this7.prop = prop;

		_this7.editView = SV.el('div', { parent: _this7.node });
		if (label) {
			SV.el('span', { parent: _this7.editView, innerHTML: label, className: 'label',
				style: { display: 'inline-block', width: '150px' } });
		}
		_this7.input = SV.el('input', { parent: _this7.editView, type: 'checkbox',
			style: { fontSize: '2em' },
			events: { change: function change() {
					var value = _this7.input.checked;
					if (_this7.data[_this7.prop] !== value) {
						var oldValue = _this7.data[_this7.prop];
						_this7.data.set(_this7.prop, value);
						_this7.emit('changed', value, oldValue);
					}
				} } });
		return _this7;
	}

	_createClass(SimpleEditCheckBox, [{
		key: 'render',
		value: function render() {
			if (this.data[this.prop]) {
				this.input.setAttribute('checked', true);
			} else {
				this.input.removeAttribute('checked');
			}
		}
	}]);

	return SimpleEditCheckBox;
}(SyncView);

var SimpleEditSelect = function (_SyncView5) {
	_inherits(SimpleEditSelect, _SyncView5);

	function SimpleEditSelect(prop, label, validator, formatter, options) {
		_classCallCheck(this, SimpleEditSelect);

		var _this8 = _possibleConstructorReturn(this, (SimpleEditSelect.__proto__ || Object.getPrototypeOf(SimpleEditSelect)).call(this));

		_this8.doFlash = true;

		_this8.prop = prop;

		_this8.editView = SV.el('div', { parent: _this8.node });
		if (label) {
			SV.el('span', { parent: _this8.editView, innerHTML: label, className: 'label',
				style: { display: 'inline-block', width: '150px' } });
		}
		var width = label ? 'calc(100% - 150px)' : '100%';
		_this8.input = SV.el('select', { parent: _this8.editView,
			style: { width: width },
			events: { blur: function blur() {
					var value = _this8.input.value;
					if (validator && !validator(value)) {
						alert('Invalid value: "' + value + '"');
						return;
					}
					if (formatter) value = formatter(value);
					if (_this8.data[_this8.prop] !== value) {
						var oldValue = _this8.data[_this8.prop];
						//var update = {};
						//update[this.prop] = value;
						_this8.data.set(_this8.prop, value);
						_this8.emit('changed', value, oldValue);
					}
				} } });
		if (options) _this8.updateOptions(options);
		return _this8;
	}

	_createClass(SimpleEditSelect, [{
		key: 'focus',
		value: function focus() {
			this.input.focus();
		}
	}, {
		key: 'updateOptions',
		value: function updateOptions(options) {
			var _this9 = this;

			this.input.innerHTML = '';
			SV.toArray(options).forEach(function (option) {
				SV.el('option', { parent: _this9.input, innerHTML: option });
			});
			if (this.data) this.input.value = this.data[this.prop] || '';
		}
	}, {
		key: 'render',
		value: function render() {
			if (this.input.value !== this.data[this.prop]) this.input.value = this.data[this.prop] || '';
		}
	}]);

	return SimpleEditSelect;
}(SyncView);

var Modal = function (_SyncView6) {
	_inherits(Modal, _SyncView6);

	function Modal() {
		_classCallCheck(this, Modal);

		var _this10 = _possibleConstructorReturn(this, (Modal.__proto__ || Object.getPrototypeOf(Modal)).call(this));

		_this10.node.className = 'modal';
		_this10.node.addEventListener('click', function () {
			_this10.hide();
		});

		_this10.mainView = SV.el('div', { parent: _this10.node, className: 'main-view group',
			events: { click: function click(e) {
					e.stopPropagation();
				} } });
		_this10.isShown = false;
		return _this10;
	}

	_createClass(Modal, [{
		key: 'show',
		value: function show() {
			if (this.isShown) return;
			this.isShown = true;
			this.node.style.display = 'initial';
			document.body.style.overflowY = 'hidden';
			this.emit('show');
		}
	}, {
		key: 'hide',
		value: function hide() {
			if (!this.isShown) return;
			this.isShown = false;
			this.node.style.display = 'none';
			document.body.style.overflowY = 'initial';
			this.emit('hide');
		}
	}, {
		key: 'render',
		value: function render() {}
	}], [{
		key: 'createModal',
		value: function createModal(view) {
			var modal = new Modal();
			modal.mainView.appendChild(view.node);
			view.on('close', function () {
				modal.hide();
			});
			document.body.appendChild(modal.node);
			return modal;
		}
	}, {
		key: 'showNotification',
		value: function showNotification(title, message) {
			var modal = new Modal();
			modal.mainView.appendChild(SV.el('h1', { innerHTML: title || '' }));
			modal.mainView.appendChild(SV.el('p', { innerHTML: message || '' }));
			modal.mainView.appendChild(SV.el('div', { innerHTML: 'Ok', className: 'btn',
				events: { click: function click() {
						modal.hide();
					} } }));
			document.body.appendChild(modal.node);
			modal.show();
		}
	}, {
		key: 'confirm',
		value: function confirm(title, message, callback) {
			var modal = new Modal();
			modal.mainView.appendChild(SV.el('h1', { innerHTML: title }));
			modal.mainView.appendChild(SV.el('p', { innerHTML: message }));
			modal.mainView.appendChild(SV.iconButton('done', { className: 'btn btn-big',
				events: { click: function click() {
						modal.hide();callback();
					} } }));
			modal.mainView.appendChild(SV.el('div', { innerHTML: 'Cancel', className: 'btn btn-big',
				events: { click: function click() {
						modal.hide();
					} } }));
			document.body.appendChild(modal.node);
			modal.show();
		}
	}]);

	return Modal;
}(SyncView);

var Tab = function (_SyncView7) {
	_inherits(Tab, _SyncView7);

	function Tab() {
		_classCallCheck(this, Tab);

		var _this11 = _possibleConstructorReturn(this, (Tab.__proto__ || Object.getPrototypeOf(Tab)).call(this));

		_this11.node.style.padding = '1em';
		_this11.node.style.boxShadow = '3px 3px 3px #555';
		_this11.node.style.backgroundColor = '#FFF';
		return _this11;
	}

	return Tab;
}(SyncView);

var TabView = function (_SyncView8) {
	_inherits(TabView, _SyncView8);

	function TabView() {
		_classCallCheck(this, TabView);

		var _this12 = _possibleConstructorReturn(this, (TabView.__proto__ || Object.getPrototypeOf(TabView)).call(this));

		_this12.node.style.minWidth = '300px';

		_this12.header = SV.el('div', { parent: _this12.node,
			style: {
				minHeight: '1em',
				position: 'relative',
				top: '1px'
			}
		});

		_this12.tabs = [];
		_this12.tabsContainer = SV.el('div', { parent: _this12.node,
			style: {
				minHeight: '1em',
				border: '1px solid #000'
			}
		});
		return _this12;
	}

	_createClass(TabView, [{
		key: 'addTab',
		value: function addTab(tab) {
			var _this13 = this;

			var headerButton = SV.el('div', { parent: this.header, innerHTML: tab.title,
				events: { click: function click() {
						_this13.showTab(tab);
					} },
				style: {
					border: '1px solid #555',
					borderBottom: '1px solid #000',
					display: 'inline-block',
					padding: '.25em',
					backgroundColor: '#DDD',
					height: '1em'
				}
			});
			tab.node.classList.add('hide');
			this.tabsContainer.appendChild(tab.node);
			this.tabs.push({ header: headerButton, tab: tab });
		}
	}, {
		key: 'showTab',
		value: function showTab(tab) {
			this.tabs.forEach(function (tabObj) {
				if (tabObj.tab === tab) {
					tabObj.tab.node.classList.remove('hide');
					tabObj.header.style.border = '1px solid #000';
					tabObj.header.style.borderBottom = '1px solid #FFF';
					tabObj.header.style.backgroundColor = '#FFF';
				} else {
					tabObj.tab.node.classList.add('hide');
					tabObj.header.style.border = '1px solid #555';
					tabObj.header.style.borderBottom = 'initial';
					tabObj.header.style.backgroundColor = '#DDD';
				}
			});
		}
	}]);

	return TabView;
}(SyncView);

var UserInfo = function (_SyncView9) {
	_inherits(UserInfo, _SyncView9);

	function UserInfo() {
		_classCallCheck(this, UserInfo);

		var _this14 = _possibleConstructorReturn(this, (UserInfo.__proto__ || Object.getPrototypeOf(UserInfo)).call(this));

		SV.mergeMap({
			float: 'right',
			margin: '3px',
			padding: '5px',
			border: '1px solid #CCC',
			borderRadius: '3px'
		}, _this14.node.style);
		_this14.username = SV.el('span', {
			parent: _this14.node
		});
		_this14.logout = SV.el('a', {
			parent: _this14.node,
			innerHTML: 'logout',
			href: '/logout'
		});
		return _this14;
	}

	_createClass(UserInfo, [{
		key: 'render',
		value: function render() {
			this.username.innerHTML = 'Hello ' + this.data.name + ' - ';
			this.username.style.color = this.data.isStaff ? '#44F' : 'default';
		}
	}]);

	return UserInfo;
}(SyncView);

var SearchBox = function (_SyncView10) {
	_inherits(SearchBox, _SyncView10);

	function SearchBox(options) {
		_classCallCheck(this, SearchBox);

		var _this15 = _possibleConstructorReturn(this, (SearchBox.__proto__ || Object.getPrototypeOf(SearchBox)).call(this));

		_this15.options = options || {};

		_this15.searchForm = SV.el('form', {
			parent: _this15.node,
			events: { submit: function submit(e) {
					if (_this15.options.submitCB) {
						_this15.options.submitCB(_this15.searchInput.value);
					}
					e.preventDefault();
				} } });
		_this15.searchInput = SV.el('input', { parent: _this15.searchForm,
			style: { width: 'calc(100% - 85px)', fontSize: '2em' } });
		_this15.submitButton = SV.el('input', { parent: _this15.searchForm, type: 'submit', value: _this15.options.buttonText || 'Go',
			style: { width: '80px', fontSize: '2em' } });
		return _this15;
	}

	_createClass(SearchBox, [{
		key: 'clear',
		value: function clear() {
			this.searchInput.value = '';
		}
	}, {
		key: 'render',
		value: function render() {}
	}]);

	return SearchBox;
}(SyncView);

var ImageUploader = function (_SyncView11) {
	_inherits(ImageUploader, _SyncView11);

	function ImageUploader(maxSize) {
		_classCallCheck(this, ImageUploader);

		var _this16 = _possibleConstructorReturn(this, (ImageUploader.__proto__ || Object.getPrototypeOf(ImageUploader)).call(this));

		_this16.maxSize = maxSize | 640;

		_this16.addInput = SV.el('input', {
			parent: _this16.node,
			type: 'file',
			accept: 'image/*',
			name: 'image',
			style: {
				display: 'none',
				fontSize: '1em',
				width: 'calc(100% - 4em)'
			},
			events: { change: function change() {
					_this16.add();
				} } });

		_this16.preview = SV.el('img', {
			parent: _this16.node,
			style: { width: '100%' },
			events: { click: function click() {
					_this16.addInput.click();
				},
				error: function error(e) {
					e.target.src = '/imgs/no_image.png';
				}
			} });
		return _this16;
	}

	_createClass(ImageUploader, [{
		key: 'add',
		value: function add() {
			this.uploadPhotos(this.addInput.files[0]);
		}
	}, {
		key: 'reloadPreview',
		value: function reloadPreview() {
			this.preview.src = this.data.image ? '/images/' + this.data.image + '?' + Date.now() : '/imgs/no_image.png';
		}
	}, {
		key: 'render',
		value: function render() {
			this.reloadPreview();
		}
	}, {
		key: 'uploadPhotos',
		value: function uploadPhotos(file) {
			var _this17 = this;

			// Ensure it's an image
			if (file.type.match(/image.*/)) {
				console.log('An image has been loaded');

				// Load the image
				var reader = new FileReader();
				reader.onload = function (readerEvent) {
					var image = new Image();
					image.onload = function (imageEvent) {

						// Resize the image
						var canvas = document.createElement('canvas'),
						    width = image.width,
						    height = image.height;
						if (width > height) {
							if (width > _this17.maxSize) {
								height *= _this17.maxSize / width;
								width = _this17.maxSize;
							}
						} else {
							if (height > _this17.maxSize) {
								width *= _this17.maxSize / height;
								height = _this17.maxSize;
							}
						}
						canvas.width = width;
						canvas.height = height;
						canvas.getContext('2d').drawImage(image, 0, 0, width, height);
						var dataUrl = canvas.toDataURL('image/jpeg');
						var resizedImage = _this17.dataURLToBlob(dataUrl);

						var form = new FormData();
						form.append('destination', ImageUploader.src(_this17.data.key));
						form.append('image', resizedImage);
						var xhr = new XMLHttpRequest();
						xhr.open('POST', '/upload', true);
						xhr.responseType = 'text';
						xhr.onload = function () {
							if (xhr.readyState === xhr.DONE) {
								if (xhr.status === 200) {
									console.log('xhr.responseText', xhr.responseText);
									_this17.emit('uploaded', xhr.responseText);
								}
							}
						};
						xhr.send(form);
					};
					image.src = readerEvent.target.result;
				};
				reader.readAsDataURL(file);
			}
		}

		/* Utility function to convert a canvas to a BLOB */

	}, {
		key: 'dataURLToBlob',
		value: function dataURLToBlob(dataURL) {
			var BASE64_MARKER = ';base64,';
			if (dataURL.indexOf(BASE64_MARKER) == -1) {
				var parts = dataURL.split(',');
				var contentType = parts[0].split(':')[1];
				var raw = parts[1];

				return new Blob([raw], { type: contentType });
			}

			var parts = dataURL.split(BASE64_MARKER);
			var contentType = parts[0].split(':')[1];
			var raw = window.atob(parts[1]);
			var rawLength = raw.length;

			var uInt8Array = new Uint8Array(rawLength);

			for (var i = 0; i < rawLength; ++i) {
				uInt8Array[i] = raw.charCodeAt(i);
			}

			return new Blob([uInt8Array], { type: contentType });
		}
	}], [{
		key: 'src',
		value: function src(key) {
			var k = key.replace(/:/g, '_');
			k = k.replace(/\./g, '_');
			return k;
		}
	}]);

	return ImageUploader;
}(SyncView);
