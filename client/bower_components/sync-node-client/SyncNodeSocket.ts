/// <reference path="./typings/tsd.d.ts" />

//declare var io: SocketIOClient;
import Sync = SyncNode;
//import Logger = require('./Logger');

"use strict";

//var Log = Logger.Log;

namespace SyncNodeSocket {

	class Request {
		requestGuid: string;
		stamp: Date;
		data: any;

		constructor(data?: any) {
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

	interface Response {
		requestGuid: string;
		stamp: Date;
		data: any;
	}

	export class SyncNodeSocket<T> {
		private path: string;
		server: SocketIOClient.Socket;
		private listeners: any[] = [];
		private syncNode: Sync.SyncNode;
		status: string;
		onStatusChanged: (path: string, status: string) => void;
		updatesDisabled: boolean = false; //To prevent loop when setting data received from server

				 serverLastModified: Date;
				 openRequests: { [key: string]: Request };

				 constructor(path: string, defaultObject: T, host?: string) {
					 this.status = 'Initializing...';

					 if (!(path[0] === '/')) path = '/' + path; //normalize

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

					 this.server.on('reconnect', (number: Number) => {
						 //	Log.log(this.path, 'Reconnected after tries: ' + number);
						 console.log('*************Reconnected');
						 this.status = 'Connected';
						 this.updateStatus(this.status);
						 this.getLatest();
					 });

					 this.server.on('reconnect_failed', (number: Number) => {
						 //	Log.error(this.path, 'Reconnection Failed. Number of tries: ' + number);
						 console.log('*************************Reconnection failed.');
					 });

					 this.server.on('update', (merge: any) => {
						 //	Log.debug(this.path, 'received update: ' + JSON.stringify(merge));
						 //console.log('*************handle update: ', merge);
						 this.updatesDisabled = true;
						 (this.syncNode as any)['local'].merge(merge);
						 this.updatesDisabled = false;
					 });

					 this.server.on('updateResponse', (response: Response) => {
						 // Log.debug(this.path, 'received response: ' + JSON.stringify(response));
						 //console.log('*************handle response: ', response);
						 this.clearRequest(response.requestGuid);
					 });

					 this.server.on('latest', (latest: any) => {
						 if (!latest) {
							 console.log('already has latest.');
							 // Log.debug(this.path, 'already has latest.');
						 } else {
							 // Log.debug(this.path, 'Received latest: ' + latest.lastModified);
							 this.serverLastModified = latest.lastModified;
							 console.log('handle latest: ', latest);
							 this.updatesDisabled = true;
							 this.syncNode.set('local', latest);
							 this.updatesDisabled = false;
						 }

						 this.sendOpenRequests();
					 });
				 }
				 sendOpenRequests() {
					 var keys = Object.keys(this.openRequests);
					 // Log.debug(this.path, 'Sending open requests: ' + keys.length.toString());
					 //console.log('Sending open requests: ', keys.length);
					 keys.forEach(key => {
						 this.sendRequest(this.openRequests[key]);
					 });
				 }
				 clearRequest(requestGuid: string) {
					 delete this.openRequests[requestGuid];
				 }
				 getLatest() {
					 console.log('doing get latest...');
					 this.server.emit('getlatest', this.serverLastModified);
					 console.log('sent get latest...');
				 }
				 updateStatus(status: string) {
					 this.status = status;
					 if (this.onStatusChanged) this.onStatusChanged(this.path, this.status);
				 }
				 createOnUpdated(node: SyncNodeSocket<T>): (updated: Sync.SyncNode, action: string, path: string, merge: any) => void {
					 return (updated: Sync.SyncNode, action: string, path: string, merge: any): void => {

						 Sync.SyncNode.addNE(updated, 'onUpdated', this.createOnUpdated(this));
						 this.syncNode = updated;

						 //console.log('syncNode updated:', action, path, merge, this.syncNode);
						 localStorage.setItem(this.path, JSON.stringify(this.get()));
						 this.queueUpdate(merge.local);
						 this.notify();
					 };
				 }
				 queueUpdate(update: any) {
					 if (!this.updatesDisabled) {
						 var request = new Request(update);
						 this.openRequests[request.requestGuid] = request;
						 this.sendRequest(request);
					 }
				 }
				 sendRequest(request: Request) {
					 this.openRequests[request.requestGuid] = request;
					 if ((this.server as any)['connected']) {
						 this.server.emit('update', request);
					 }
				 }
				 onUpdated(callback: (updated: T) => void) {
					 this.listeners.push(callback);
				 }
				 notify() {
					 this.listeners.forEach((callback: any) => {
						 callback(this.get());
					 });
				 }
				 get(): T {
					 return (this.syncNode as any)['local'] as T;
				 }
				 stop() {
					 delete this.syncNode.onUpdated;
					 this.server.close();
				 }
	}

}
