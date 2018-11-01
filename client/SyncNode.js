"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventEmitter = function () {
	function EventEmitter() {
		_classCallCheck(this, EventEmitter);

		SyncNode.addNE(this, '__eventHandlers', {});
	}

	_createClass(EventEmitter, [{
		key: 'on',
		value: function on(eventName, handler) {
			if (!this.__eventHandlers[eventName]) this.__eventHandlers[eventName] = {};
			this.__eventHandlers[eventName][handler] = handler;
		}
	}, {
		key: 'emit',
		value: function emit(eventName) {
			var handlers = this.__eventHandlers[eventName] || {};
			var args = new Array(arguments.length - 1);
			for (var i = 1; i < arguments.length; ++i) {
				args[i - 1] = arguments[i];
			}
			Object.keys(handlers).forEach(function (key) {
				handlers[key].apply(null, args);
			});
		}
	}]);

	return EventEmitter;
}();

var syncNodeIdCounterForDebugging = 0;

var SyncNode = function (_EventEmitter) {
	_inherits(SyncNode, _EventEmitter);

	function SyncNode(obj, parent) {
		_classCallCheck(this, SyncNode);

		var _this = _possibleConstructorReturn(this, (SyncNode.__proto__ || Object.getPrototypeOf(SyncNode)).call(this));

		obj = obj || {};
		SyncNode.addNE(_this, '__syncNodeId', syncNodeIdCounterForDebugging++);
		SyncNode.addNE(_this, '__isUpdatesDisabled', false);
		SyncNode.addNE(_this, 'parent', parent);

		Object.keys(obj).forEach(function (propName) {
			var propValue = obj[propName];
			if ((typeof propValue === 'undefined' ? 'undefined' : _typeof(propValue)) === 'object' && propValue != null) {
				if (!SyncNode.isSyncNode(propValue)) {
					propValue = new SyncNode(propValue);
				}

				SyncNode.addNE(propValue, 'parent', _this);
				propValue.on('updated', _this.createOnUpdated(propName));
			}
			_this[propName] = propValue;
		});
		return _this;
	}

	_createClass(SyncNode, [{
		key: 'createOnUpdated',
		value: function createOnUpdated(propName) {
			var _this2 = this;

			return function (updated, merge) {
				if (!_this2.__isUpdatesDisabled) {
					var newUpdated = _this2;
					var newMerge = {};
					newMerge[propName] = merge;
					if (updated.version) {
						_this2.version = updated.version;
					} else {
						_this2.version = SyncNode.guidShort();
					}
					newMerge.version = _this2.version;
					_this2.emit('updated', newUpdated, newMerge);
				}
			};
		}
	}, {
		key: 'set',
		value: function set(key, val) {
			var merge = {};
			var split = key.split('.');
			var curr = merge;
			for (var i = 0; i < split.length - 1; i++) {
				curr[split[i]] = {};
				curr = curr[split[i]];
			}
			curr[split[split.length - 1]] = val;
			var result = this.merge(merge);
			return this;
		}
	}, {
		key: 'get',
		value: function get(path) {
			if (!path) return this;
			return SyncNode.getHelper(this, path.split('.'));
		}
	}, {
		key: 'remove',
		value: function remove(key) {
			if (this.hasOwnProperty(key)) {
				this.merge({ '__remove': key });
			}
			return this;
		}
	}, {
		key: 'merge',
		value: function merge(_merge) {
			var result = this.doMerge(_merge);
			if (result.hasChanges) {
				this.emit('updated', this, result.merge);
			}
			return this;
		}
	}, {
		key: 'doMerge',
		value: function doMerge(merge, disableUpdates) {
			var _this3 = this;

			var hasChanges = false;
			var isEmpty = false;
			var newMerge = {};
			Object.keys(merge).forEach(function (key) {
				if (key === '__remove') {
					var propsToRemove = merge[key];
					if (!Array.isArray(propsToRemove) && typeof propsToRemove === 'string') {
						var arr = [];
						arr.push(propsToRemove);
						propsToRemove = arr;
					}
					propsToRemove.forEach(function (prop) {
						delete _this3[prop];
					});
					if (!disableUpdates) {
						_this3.version = SyncNode.guidShort();
						newMerge['__remove'] = propsToRemove;
						hasChanges = true;
					}
				} else {
					var currVal = _this3[key];
					var newVal = merge[key];
					if (!SyncNode.equals(currVal, newVal)) {
						if (!SyncNode.isObject(newVal)) {
							// at a leaf node of the merge
							// we already know they aren't equal, simply set the value
							_this3[key] = newVal;
							if (!disableUpdates) {
								_this3.version = SyncNode.guidShort();
								newMerge[key] = newVal;
								hasChanges = true;
							}
						} else {
							// about to merge an object, make sure currVal is a SyncNode	
							if (!SyncNode.isSyncNode(currVal)) {
								currVal = new SyncNode({}, _this3);
							}

							currVal.on('updated', _this3.createOnUpdated(key));

							var result = currVal.doMerge(newVal, disableUpdates);
							if (typeof _this3[key] === 'undefined') {
								result.hasChanges = true;
							}
							_this3[key] = currVal;
							if (!disableUpdates && result.hasChanges) {
								if (typeof currVal.version === 'undefined') {
									currVal.version = SyncNode.guidShort();
								}
								_this3.version = currVal.version;
								newMerge[key] = result.merge;
								hasChanges = true;
							}
						}
					}
				}
			});
			if (!disableUpdates && hasChanges) {
				newMerge.version = this.version;
				return { hasChanges: true, merge: newMerge };
			} else {
				return { hasChanges: false, merge: newMerge };
			}
		}
	}], [{
		key: 'equals',
		value: function equals(obj1, obj2) {
			// use === to differentiate between undefined and null
			if (obj1 === null && obj2 === null) {
				return true;
			} else if (obj1 != null && obj2 == null || obj1 == null && obj2 != null) {
				return false;
			} else if (obj1 && obj2 && obj1.version && obj2.version) {
				return obj1.version === obj2.version;
			} else if ((typeof obj1 === 'undefined' ? 'undefined' : _typeof(obj1)) !== 'object' && (typeof obj2 === 'undefined' ? 'undefined' : _typeof(obj2)) !== 'object') {
				return obj1 === obj2;
			}

			return false;
		}
	}, {
		key: 'getHelper',
		value: function getHelper(obj, split) {
			var isObject = SyncNode.isObject(obj);
			if (split.length === 1) {
				return isObject ? obj[split[0]] : null;
			}
			if (!isObject) return null;
			return SyncNode.getHelper(obj[split[0]], split.slice(1, split.length));
		}
	}, {
		key: 'isObject',
		value: function isObject(val) {
			return (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object' && val != null;
		}
	}, {
		key: 'isSyncNode',
		value: function isSyncNode(val) {
			if (!SyncNode.isObject(val)) return false;
			var className = val.constructor.toString().match(/\w+/g)[1];
			return className === 'SyncNode';
		}
	}, {
		key: 'addNE',
		value: function addNE(obj, propName, value) {
			Object.defineProperty(obj, propName, {
				enumerable: false,
				configurable: true,
				writable: true,
				value: value
			});
		}
	}, {
		key: 's4',
		value: function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
	}, {
		key: 'guidShort',
		value: function guidShort() {
			return SyncNode.s4() + SyncNode.s4();
		}
	}, {
		key: 'guid',
		value: function guid() {
			return SyncNode.s4() + SyncNode.s4() + '-' + SyncNode.s4() + '-' + SyncNode.s4() + '-' + SyncNode.s4() + '-' + SyncNode.s4() + SyncNode.s4() + SyncNode.s4();
		}
	}]);

	return SyncNode;
}(EventEmitter);

var LocalSyncNode = function (_SyncNode) {
	_inherits(LocalSyncNode, _SyncNode);

	function LocalSyncNode(id) {
		_classCallCheck(this, LocalSyncNode);

		var data = JSON.parse(localStorage.getItem(id));

		var _this4 = _possibleConstructorReturn(this, (LocalSyncNode.__proto__ || Object.getPrototypeOf(LocalSyncNode)).call(this, data));

		_this4.on('updated', function () {
			localStorage.setItem(id, JSON.stringify(_this4));
		});
		return _this4;
	}

	return LocalSyncNode;
}(SyncNode);