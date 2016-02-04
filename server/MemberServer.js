"use strict"

var fs = require('fs');
var path = require('path');
var SyncNodeServer = require('./SyncNodeServer.js').SyncNodeServer;


class MemberServer extends SyncNodeServer {

	constructor(io) {
		super('/members', io, {});
		this.defaultMemberData = {};
	}

	start() {
		super.start();

		this.memberIoNamespace = this.io.of('/memberdata');
		this.memberIoNamespace.on('connection', (socket) => {
			var user = socket.request.user;
			console.log(user.data.info.name + ' connected to ' + this.memberIoNamespace);
			if(!this.data[user.key]) {
				this.data[user.key] = {}
			}
			if(!this.data[user.key].data) {
				this.data[user.key].data = JSON.parse(JSON.stringify(this.defaultData)); // copy to new obj
			}
			var userData = this.data[user.key].data || {};
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
				for(var id in this.memberIoNamespace.connected) {
					var sock = this.memberIoNamespace.connected[id];
					if(sock.request.user && 
					   sock.request.user.key === socket.request.user.key) {
						sock.emit('update', merge);
					}
				};
			});
		});
	}
}

exports.MemberServer = MemberServer;
