"use strict";

class Request {
	constructor(data) {
		this.requestGuid = Request.guid();
		this.stamp = new Date();
		this.data = data;
	}
	static guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();
	}
}

class SyncNodeSocket {
	constructor(path, defaultObject, host) {
		this.listeners = [];
		this.updatesDisabled = false; //To prevent loop when setting data received from server
		this.status = 'Initializing...';
		if (!(path[0] === '/'))
			path = '/' + path; //normalize
		this.path = path;
		this.openRequests = {};
		this.defaultObject = defaultObject || {};
		this.setLocal(new SyncNode(JSON.parse(localStorage.getItem(this.path)))); //get local cache
		this.serverLastModified = null;
		host = host || ('//' + location.host);
		var socketHost = host + path;
		console.log('Connecting to namespace: "' + socketHost + '"');
		this.server = io(socketHost);
		this.server.on('connect', () => {
			//	Log.log(this.path, 'Connected');
			console.log('*************CONNECTED');
			this.status = 'Connected';
			this.updateStatus(this.status);
			this.getLatest();
		});
		this.server.on('disconnect', () => {
			//	Log.log(this.path, 'Disconnected');
			console.log('*************DISCONNECTED');
			this.status = 'Disconnected';
			this.updateStatus(this.status);
		});
		this.server.on('reconnect', (number) => {
			//	Log.log(this.path, 'Reconnected after tries: ' + number);
			console.log('*************Reconnected after ' + number + ' tries');
			this.status = 'Connected';
			this.updateStatus(this.status);
			this.getLatest();
		});
		this.server.on('reconnect_failed', (number) => {
			//	Log.error(this.path, 'Reconnection Failed. Number of tries: ' + number);
			console.log('*************************Reconnection failed.');
		});
		this.server.on('update', (merge) => {
			//	Log.debug(this.path, 'received update: ' + JSON.stringify(merge));
			console.log('*************handle update: ', merge);
			this.updatesDisabled = true;
			this.local.merge(merge);
			this.updatesDisabled = false;
		});
		this.server.on('updateResponse', (response) => {
			// Log.debug(this.path, 'received response: ' + JSON.stringify(response));
			//console.log('*************handle response: ', response);
			this.clearRequest(response.requestGuid);
		});
		this.server.on('latest', (latest) => {
			if (!latest) {
				console.log('already has latest.');
			}
			else {
				// Log.debug(this.path, 'Received latest: ' + latest.lastModified);
				this.serverLastModified = latest.lastModified;
				console.log('handle latest: ', latest);
				//this.updatesDisabled = true;
				localStorage.setItem(this.path, JSON.stringify(latest));
				this.setLocal(new SyncNode(latest));
				//this.syncNode.set('local', latest);
				//this.updatesDisabled = false;
			}
		this.sendOpenRequests();
		});
	}
	setLocal(syncNode) {		
		this.local = syncNode;
		this.local.on('updated', (updated, merge) => {
			localStorage.setItem(this.path, JSON.stringify(this.local));
			this.queueUpdate(merge);
			this.notify();
		});
		this.notify();
	}
	sendOpenRequests() {
		var keys = Object.keys(this.openRequests);
		// Log.debug(this.path, 'Sending open requests: ' + keys.length.toString());
		//console.log('Sending open requests: ', keys.length);
		keys.forEach((key) => {
			this.sendRequest(this.openRequests[key]);
		});
	}
	clearRequest(requestGuid) {
		delete this.openRequests[requestGuid];
	}
	getLatest() {
		console.log('doing get latest...');
		this.server.emit('getlatest', this.serverLastModified);
		console.log('sent get latest...');
	}
	updateStatus(status) {
		this.status = status;
		if (this.onStatusChanged)
			this.onStatusChanged(this.path, this.status);
	}
	createOnUpdated(node) {
		return (updated, action, path, merge) => {
			SyncNode.SyncNode.addNE(updated, 'onUpdated', this.createOnUpdated(this));
			this.syncNode = updated;
			//console.log('syncNode updated:', action, path, merge, this.syncNode);
			localStorage.setItem(this.path, JSON.stringify(this.get()));
			this.queueUpdate(merge.local);
			this.notify();
		};
	}
	queueUpdate(update) {
		if (!this.updatesDisabled) {
			var request = new Request(update);
			this.openRequests[request.requestGuid] = request;
			this.sendRequest(request);
		}
	}
	sendRequest(request) {
		this.openRequests[request.requestGuid] = request;
		if (this.server['connected']) {
			this.server.emit('update', request);
		}
	}
	onUpdated(callback) {
		this.listeners.push(callback);
	}
	notify() {
		this.listeners.forEach((callback) => {
			callback(this.get());
		});
	}
	get() {
		return this.local;	
		//return this.syncNode['local'];
	}
}
