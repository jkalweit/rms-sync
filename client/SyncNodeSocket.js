"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Request = function Request(data, concurrencyVersion) {
	_classCallCheck(this, Request);

	this.requestGuid = SyncNode.guid();
	this.stamp = new Date();
	this.data = data;
	this.concurrencyVersion = concurrencyVersion;
};

var SyncNodeSocket = function (_EventEmitter) {
	_inherits(SyncNodeSocket, _EventEmitter);

	function SyncNodeSocket(path, defaultObject, host) {
		_classCallCheck(this, SyncNodeSocket);

		var _this = _possibleConstructorReturn(this, (SyncNodeSocket.__proto__ || Object.getPrototypeOf(SyncNodeSocket)).call(this));

		_this.updatesDisabled = false; //To prevent loop when setting data received from server
		_this.status = 'Initializing...';
		if (!(path[0] === '/')) path = '/' + path; //normalize
		_this.path = path;
		_this.openRequests = {};
		_this.defaultObject = defaultObject || {};
		_this.setLocal(new SyncNode(JSON.parse(localStorage.getItem(_this.path)))); //get local cache
		host = host || '//' + location.host;
		var socketHost = host + path;
		console.log('Connecting to namespace: "' + socketHost + '"');
		_this.server = io(socketHost);
		_this.server.on('connect', function () {
			console.log('*************CONNECTED');
			_this.status = 'Connected';
			_this.updateStatus(_this.status);
			_this.getLatest();
		});
		_this.server.on('disconnect', function () {
			console.log('*************DISCONNECTED');
			_this.status = 'Disconnected';
			_this.updateStatus(_this.status);
		});
		_this.server.on('reconnect', function (number) {
			console.log('*************Reconnected after ' + number + ' tries');
			_this.status = 'Connected';
			_this.updateStatus(_this.status);
		});
		_this.server.on('reconnect_failed', function (number) {
			console.log('*************************Reconnection failed.');
		});
		_this.server.on('update', function (merge) {
			//console.log('*************handle update: ', merge);
			_this.updatesDisabled = true;
			var result = _this.data.doMerge(merge, true);
			_this.concurrencyVersion = merge.version;
			_this.emit('updated', _this.data, merge);
			_this.updatesDisabled = false;
			//console.log('*************AFTER handle update: ', this.data);
		});
		_this.server.on('updateResponse', function (response) {
			//console.log('*************handle response: ', response);
			_this.clearRequest(response.requestGuid);
		});
		_this.server.on('latest', function (latest) {
			if (!latest) {
				console.log('already has latest.'); //, this.data);
				_this.emit('updated', _this.data);
			} else {
				console.log('handle latest');
				localStorage.setItem(_this.path, JSON.stringify(latest));
				_this.setLocal(new SyncNode(latest));
			}
			_this.sendOpenRequests();
		});
		return _this;
	}

	_createClass(SyncNodeSocket, [{
		key: 'setLocal',
		value: function setLocal(syncNode) {
			var _this2 = this;

			this.data = syncNode;
			this.data.on('updated', function (updated, merge) {
				localStorage.setItem(_this2.path, JSON.stringify(_this2.data));
				_this2.queueUpdate(merge);
				_this2.concurrencyVersion = merge.version;
				_this2.emit('updated', _this2.data, merge);
			});
			this.concurrencyVersion = this.data.version;
			this.emit('updated', this.data);
		}
	}, {
		key: 'sendOpenRequests',
		value: function sendOpenRequests() {
			var _this3 = this;

			var keys = Object.keys(this.openRequests);
			keys.forEach(function (key) {
				_this3.sendRequest(_this3.openRequests[key]);
			});
		}
	}, {
		key: 'clearRequest',
		value: function clearRequest(requestGuid) {
			delete this.openRequests[requestGuid];
		}
	}, {
		key: 'getLatest',
		value: function getLatest() {
			this.sendOpenRequests();
			this.server.emit('getLatest', this.data.version); //, this.serverLastModified);
			console.log('sent get latest...', this.data.version);
		}
	}, {
		key: 'updateStatus',
		value: function updateStatus(status) {
			this.status = status;
			this.emit('statusChanged', this.path, this.status);
		}
	}, {
		key: 'queueUpdate',
		value: function queueUpdate(update) {
			if (!this.updatesDisabled) {
				var request = new Request(update, this.concurrencyVersion);
				this.sendRequest(request);
			}
		}
	}, {
		key: 'sendRequest',
		value: function sendRequest(request) {
			this.openRequests[request.requestGuid] = request;
			if (this.server['connected']) {
				this.server.emit('update', request);
			}
		}
	}]);

	return SyncNodeSocket;
}(EventEmitter);