/// <reference path="./typings/tsd.d.ts" />
//declare var io: SocketIOClient;
var Sync = SyncNode;
//import Logger = require('./Logger');
"use strict";
//var Log = Logger.Log;
var SyncNodeSocket;
(function (SyncNodeSocket_1) {
    var Request = (function () {
        function Request(data) {
            this.requestGuid = Request.guid();
            this.stamp = new Date();
            this.data = data;
        }
        Request.guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        };
        return Request;
    })();
    var SyncNodeSocket = (function () {
        function SyncNodeSocket(path, defaultObject, host) {
            var _this = this;
            this.listeners = [];
            this.updatesDisabled = false; //To prevent loop when setting data received from server
            this.status = 'Initializing...';
            if (!(path[0] === '/'))
                path = '/' + path; //normalize
            this.path = path;
            this.openRequests = {};
            var localCached = JSON.parse(localStorage.getItem(this.path)); //get local cache
            this.serverLastModified = null;
            this.syncNode = new Sync.SyncNode({ local: localCached || defaultObject });
            Sync.SyncNode.addNE(this.syncNode, 'onUpdated', this.createOnUpdated(this));
            host = host || ('http://' + location.host);
            var socketHost = host + path;
            console.log('Connecting to namespace: "' + socketHost + '"');
            this.server = io(socketHost);
            this.server.on('connect', function () {
                //	Log.log(this.path, 'Connected');
                console.log('*************CONNECTED');
                _this.status = 'Connected';
                _this.updateStatus(_this.status);
                _this.getLatest();
            });
            this.server.on('disconnect', function () {
                //	Log.log(this.path, 'Disconnected');
                console.log('*************DISCONNECTED');
                _this.status = 'Disconnected';
                _this.updateStatus(_this.status);
            });
            this.server.on('reconnect', function (number) {
                //	Log.log(this.path, 'Reconnected after tries: ' + number);
                console.log('*************Reconnected');
                _this.status = 'Connected';
                _this.updateStatus(_this.status);
                _this.getLatest();
            });
            this.server.on('reconnect_failed', function (number) {
                //	Log.error(this.path, 'Reconnection Failed. Number of tries: ' + number);
                console.log('*************************Reconnection failed.');
            });
            this.server.on('update', function (merge) {
                //	Log.debug(this.path, 'received update: ' + JSON.stringify(merge));
                //console.log('*************handle update: ', merge);
                _this.updatesDisabled = true;
                _this.syncNode['local'].merge(merge);
                _this.updatesDisabled = false;
            });
            this.server.on('updateResponse', function (response) {
                // Log.debug(this.path, 'received response: ' + JSON.stringify(response));
                //console.log('*************handle response: ', response);
                _this.clearRequest(response.requestGuid);
            });
            this.server.on('latest', function (latest) {
                if (!latest) {
                    console.log('already has latest.');
                }
                else {
                    // Log.debug(this.path, 'Received latest: ' + latest.lastModified);
                    _this.serverLastModified = latest.lastModified;
                    console.log('handle latest: ', latest);
                    _this.updatesDisabled = true;
                    _this.syncNode.set('local', latest);
                    _this.updatesDisabled = false;
                }
                _this.sendOpenRequests();
            });
        }
        SyncNodeSocket.prototype.sendOpenRequests = function () {
            var _this = this;
            var keys = Object.keys(this.openRequests);
            // Log.debug(this.path, 'Sending open requests: ' + keys.length.toString());
            //console.log('Sending open requests: ', keys.length);
            keys.forEach(function (key) {
                _this.sendRequest(_this.openRequests[key]);
            });
        };
        SyncNodeSocket.prototype.clearRequest = function (requestGuid) {
            delete this.openRequests[requestGuid];
        };
        SyncNodeSocket.prototype.getLatest = function () {
            console.log('doing get latest...');
            this.server.emit('getlatest', this.serverLastModified);
            console.log('sent get latest...');
        };
        SyncNodeSocket.prototype.updateStatus = function (status) {
            this.status = status;
            if (this.onStatusChanged)
                this.onStatusChanged(this.path, this.status);
        };
        SyncNodeSocket.prototype.createOnUpdated = function (node) {
            var _this = this;
            return function (updated, action, path, merge) {
                Sync.SyncNode.addNE(updated, 'onUpdated', _this.createOnUpdated(_this));
                _this.syncNode = updated;
                //console.log('syncNode updated:', action, path, merge, this.syncNode);
                localStorage.setItem(_this.path, JSON.stringify(_this.get()));
                _this.queueUpdate(merge.local);
                _this.notify();
            };
        };
        SyncNodeSocket.prototype.queueUpdate = function (update) {
            if (!this.updatesDisabled) {
                var request = new Request(update);
                this.openRequests[request.requestGuid] = request;
                this.sendRequest(request);
            }
        };
        SyncNodeSocket.prototype.sendRequest = function (request) {
            this.openRequests[request.requestGuid] = request;
            if (this.server['connected']) {
                this.server.emit('update', request);
            }
        };
        SyncNodeSocket.prototype.onUpdated = function (callback) {
            this.listeners.push(callback);
        };
        SyncNodeSocket.prototype.notify = function () {
            var _this = this;
            this.listeners.forEach(function (callback) {
                callback(_this.get());
            });
        };
        SyncNodeSocket.prototype.get = function () {
            return this.syncNode['local'];
        };
        SyncNodeSocket.prototype.stop = function () {
            delete this.syncNode.onUpdated;
            this.server.close();
        };
        return SyncNodeSocket;
    })();
    SyncNodeSocket_1.SyncNodeSocket = SyncNodeSocket;
})(SyncNodeSocket || (SyncNodeSocket = {}));
//# sourceMappingURL=SyncNodeSocket.js.map