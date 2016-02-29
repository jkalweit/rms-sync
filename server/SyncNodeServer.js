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

// TODO: implement versions on each node to enforce optimistic concurrency.
//
//
class SyncNodeServer {
    constructor(namespace, io, defaultData) {
        if (defaultData === void 0) { defaultData = {}; }
        this.namespace = namespace;
        this.directory = '../data';
        this.io = io;
        this.get((data) => {
            this.data = data;
            if (!this.data) {
                this.data = JSON.parse(JSON.stringify(defaultData)); // Use a copy for immutability
            }
            this.start();
        });
    }
    start() {
        this.ioNamespace = this.io.of(this.namespace);
        this.ioNamespace.on('connection', (socket) => {
            console.log('someone connected to ' + this.namespace);
            socket.on('getlatest', (clientLastModified) => {
                console.log('getlatest', this.data.lastModified, clientLastModified);
                if (!clientLastModified || clientLastModified < this.data.lastModified) {
                    socket.emit('latest', this.data);
                }
                else {
                    console.log('already has latest.');
                    socket.emit('latest', null);
                }
            });
            socket.on('update', (request) => {
                var merge = request.data;
		if(merge.lastModified && this.data.lastModified > merge.lastModified) {
			// Probably should stop here and send a concurency error response to client:
			console.error('WARNING: Server version lastModified GREATER THAN merge lastModified', this.data.lastModified, merge.lastModified);
		}
		var newLastModified = new Date().toISOString();
                this.doMerge(this.data, merge, newLastModified);
                this.persist();
		// merge is updated with new lastModified, send to client in updateResponse
                socket.emit('updateResponse', new Response(request.requestGuid, merge));
                socket.broadcast.emit('update', merge);
                if (this.onMerge)
                    this.onMerge(merge);
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

	doMerge(obj, merge, newLastModified) {
		if(typeof merge !== 'object') {
			// end of recursion
			return merge;
		}
		Object.keys(merge).forEach((key) => {			
			if (key === '__remove') {
				delete obj[merge[key]];
			}
			else {
				var nextObj = (obj[key] || {});
				obj[key] = this.doMerge(nextObj, merge[key]);
				obj.lastModified = newLastModified;
			}
		});
		return obj;
	}
}

exports.SyncNodeServer = SyncNodeServer;
exports.Response = Response;
