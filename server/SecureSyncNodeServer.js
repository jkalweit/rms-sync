"use strict"

var fs = require('fs');
var path = require('path');

class Response {
	constructor(requestGuid, data) {
		this.requestGuid = requestGuid;
		this.stamp = new Date();
		this.data = data;
	}
}

class SecureSyncNodeServer {

	constructor(namespace, io, defaultData) {
		this.defaultData = defaultData || {};
		this.namespace = namespace;
		this.directory = '../data';
		this.io = io;
		this.get((data) => {
			this.data = data;
			if (!this.data) {
				this.data = {};
			}
			this.start();
		});
	}

	start() {
		this.ioNamespace = this.io.of(this.namespace);
		this.ioNamespace.on('connection', (socket) => {
			var user = socket.request.user;
			console.log(user.name + ' connected to ' + this.namespace);
			if(!this.data[user.key]) {
				this.data[user.key] = JSON.parse(JSON.stringify(this.defaultData)); // copy to new obj
			}
			var userData = this.data[user.key];
			socket.on('getlatest', (clientLastModified) => {
				console.log(user.key, 'getlatest', userData.lastModified, clientLastModified);
				if (!clientLastModified || clientLastModified < userData.lastModified) {
					socket.emit('latest', userData);
				}
				else {
					console.log('already has latest.');
					socket.emit('latest', null);
				}
			});
			socket.on('update', (request) => {
				var merge = request.data;
				this.doMerge(userData, merge);
				this.persist();
				socket.emit('updateResponse', new Response(request.requestGuid, null));
				for(var id in this.ioNamespace.connected) {
					var sock = this.ioNamespace.connected[id];
					if(sock.request.user && 
					   sock.request.user.key === socket.request.user.key) {
						console.log('match!');
						sock.emit('update', merge);
					} else console.log('no match', sock.request.user);
				};
				//socket.broadcast.emit('update', merge);
			});
		});
	}

	get(callback) {
		var path = this.buildFilePath();
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				if (err.code === 'ENOENT') {
					callback(null);
				}
				else {
					console.error('Failed to read ' + path + ': ' + err);
					callback(null);
				}
			}
			else {
				callback(JSON.parse(data));
			}
		});
	}

	persist() {
		var path = this.buildFilePath();
		console.log(path);
		fs.mkdir(this.directory, null, (err) => {
			if (err) {
				// ignore the error if the folder already exists
				if (err.code != 'EEXIST') {
					console.error('Failed to create folder ' + this.directory + ': ' + err);
					return;
				}
			}
			fs.writeFile(path, JSON.stringify(this.data), (err) => {
				if (err) {
					console.error('Failed to write ' + path + ': ' + err);
				}
			});
		});
	}

	buildFilePath() {
		return path.join(this.directory, this.namespace + '.json');
	}

	doMerge(obj, merge) {
		if (typeof merge !== 'object')
			return merge;
		Object.keys(merge).forEach((key) => {
			if (key === 'lastModified' && obj[key] > merge[key]) {
				console.error('Server version lastModified GREATER THAN merge lastModified', obj[key], merge[key]);
			}
			if (key === 'meta') {
			}
			else if (key === '__remove') {
				delete obj[merge[key]];
			}
			else {
				var nextObj = (obj[key] || {});
				obj[key] = this.doMerge(nextObj, merge[key]);
			}
		});
		return obj;
	}
}

exports.SecureSyncNodeServer = SecureSyncNodeServer;
