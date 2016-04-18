"use strict"

var fs = require('fs');
var path = require('path');
var SyncNodeServer = require('./SyncNodeServer.js');


class MemberServer extends SyncNodeServer.SyncNodeServer {

	constructor(io) {
		super('/members', io, {});
		this.defaultMemberData = {};
	}

	start() {
		super.start();

		this.memberIoNamespace = this.io.of('/memberdata');
		this.memberIoNamespace.on('connection', (socket) => {
			var user = socket.request.user;
			if(user) {
				console.log(user.data.info.name + ' connected to ' + this.memberIoNamespace);
			} else {
				console.log('WARNING: UNKNOWN user connected to ' + this.memberIoNamespace);
			}
			if(!this.data[user.key]) {
				this.data[user.key] = {}
			}
			if(!this.data[user.key].data) {
				this.data[user.key].data = JSON.parse(JSON.stringify(this.defaultData)); // copy to new obj
			}
			var userData = this.data[user.key].data || {};
			socket.on('getLatest', (clientVersion) => {
				console.log(user.key, 'memberdata getlatest', userData.version, clientVersion);
				if (!clientVersion || clientVersion !== userData.version) {
					socket.emit('latest', userData);
				}
				else {
					console.log('already has latest member data.');
					socket.emit('latest', null);
				}
			});
			socket.on('update', (request) => {
				var merge = {};
			       	merge[user.key] = { data: request.data };
				this.doMerge(this.data, merge);
				this.persist();
				socket.emit('updateResponse', new SyncNodeServer.Response(request.requestGuid, null));
				console.log('emitting member update', socket.request.user.key);
				this.ioNamespace.emit('update', merge); 
				this.emitMemberUpdate(merge[user.key].data, socket.request.user.key, socket);
			});
		});
	}
	onMerge(merge, excludeSocket) {
		var memberKey;
		Object.keys(merge).forEach((key) => {
			if(key !== 'lastModified') memberKey = key;	
		});		
		if(memberKey) {
			var userMerge = merge[memberKey];
			this.emitMemberUpdate(userMerge.data, memberKey);
		}
	}
	emitUpdate(merge) {
		this.ioNamespace.emit('update', merge);
	}
	emitMemberUpdate(merge, memberKey, excludeSocket) {
		for(var id in this.memberIoNamespace.connected) {
			var sock = this.memberIoNamespace.connected[id];
			if(sock.request.user && 
					sock.request.user.key === memberKey) {
						if(sock !== excludeSocket) {
							sock.emit('update', merge);
						} else console.log('excluding socket');
					}
		};
	}

	verifyEmailAddress(verificationId, res) {
		console.log('verifying', verificationId);
		var keys = Object.keys(this.data);
		for(var i = 0; i < keys.length; i++) {					
			var key = keys[i];
			if(key !== 'lastModified') {
				var member = this.data[key];			
				console.log('member', member); 
				if(member.data.info.emailVerificationId === verificationId) {
					console.log('verified!', member);
					var merge = {};
					merge[member.key] =  {
						'data': {
							'info': {
								isEmailVerified: true
							}
						}
					};
					this.doMerge(this.data, merge);				
					this.persist();
					this.emitUpdate(merge);
					this.emitMemberUpdate(merge.data, member.key);
					res.end('Verified ' + verificationId);
					return;
				}
			}
		}

		res.end('Not Verified: ' + verificationId);
	}
}

exports.MemberServer = MemberServer;
