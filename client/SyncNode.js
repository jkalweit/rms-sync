"use strict";


class EventEmitter {
	constructor() {
            	SyncNode.addNE(this, '__eventHandlers', {});
	}
	on(eventName, handler) {
		if(!this.__eventHandlers[eventName]) this.__eventHandlers[eventName] = [];
		this.__eventHandlers[eventName].push(handler);
	}
	emit(eventName) {
		var handlers = this.__eventHandlers[eventName] || [];
		var args = new Array(arguments.length-1);
		for(var i = 1; i < arguments.length; ++i) {
			args[i-1] = arguments[i];
		}
		handlers.forEach(handler => { handler.apply(null, args); });
	}
}

var syncNodeIdCounterForDebugging = 0;
class SyncNode extends EventEmitter {
	constructor(obj) {
		super();

		obj = obj || {};
            	SyncNode.addNE(this, '__syncNodeId', syncNodeIdCounterForDebugging++);
            	SyncNode.addNE(this, '__isUpdatesDisabled', false);
		this.lastModified = obj.lastModified || new Date(0).toISOString();

		Object.keys(obj).forEach((propName) => {
			var propValue = obj[propName];
			if (typeof propValue === 'object') {
				var className = propValue.constructor.toString().match(/\w+/g)[1];
				if (className !== 'SyncNode') {
					propValue = new SyncNode(propValue);
				} else {
					//console.log('-------className', className);
				}

				SyncNode.addNE(propValue, 'parent', this);
				propValue.on('updated', this.createOnUpdated(propName));
			}
			this[propName] = propValue;
		});
	}
	createOnUpdated(propName) {
		return (updated, merge) => {				
			this.lastModified = updated.lastModified;
			if(!this.__isUpdatesDisabled) {
				var newUpdated = this;
				var newMerge = {};
				newMerge[propName] = merge;
				newMerge.lastModified = merge.lastModified;
				//console.log('emitting update', propName);
				this.emit('updated', newUpdated, newMerge);
			} else {
				//console.log('updatesDisabled', propName);
			}
		}
	}
	set(obj, optionalVal) {
		// Allow for old style setting: set(propName, value)
		if(typeof obj === 'string') {
			var property = obj;
			obj = {};
			obj[property] = optionalVal; 
		}		

		Object.keys(obj).forEach((key) => {
			var val = obj[key];
			if(val && typeof val === 'object') {				
				var className = val.constructor.toString().match(/\w+/g)[1];
				if (className !== 'SyncNode') {
					val = new SyncNode(val);
					SyncNode.addNE(val, 'parent', this);
					val.on('updated', this.createOnUpdated(key));
				}
			}
			//console.log('setting', key, val);
			this[key] = val;			
		});
		if(!obj.lastModified) obj.lastModified = new Date().toISOString();
		this.lastModified = obj.lastModified;
		if(!this.__isUpdatesDisabled) {
			var merge = obj;
			var updated = this;
			this.emit('updated', updated, merge);
		}
	}
	merge(merge, lastModified) {
		if (merge.lastModified && (this.lastModified > merge.lastModified)) {
			console.log('****WARNING*****: local version is NEWER than server version.' + this.lastModified + ' ' + merge.lastModified);
		}
		this.__isUpdatesDisabled = true;
		lastModified = lastModified || new Date().toISOString();
		Object.keys(merge).forEach((key) => {
			// console.log('merging', key, merge);
			if (key === '__remove') {
				var propToRemove = merge[key];
				console.log('deleted', propToRemove, this);
				delete this[propToRemove];
				console.log('deleted', propToRemove, this);
			} else {
				var nextNode = this[key];			
				if (!nextNode || typeof nextNode !== 'object') {
					merge.lastModified = lastModified;
					var val = {};
					val[key] = merge[key];	
					val.lastModified = lastModified;
					this.set(val);
				}
				else {
					nextNode.merge(merge[key], lastModified);				
				}
			}
		});
		this.lastModified = lastModified;
		merge.lastModified = lastModified;
		this.__isUpdatesDisabled = false;

		var newUpdated = this;
		//console.log('merge', merge);
		//console.log('new updated', newUpdated);
		this.emit('updated', newUpdated, merge);
        }
	remove(key) {
	       if(this.hasOwnProperty(key)) this.merge({ '__remove': key });
	}
	static addNE(obj, propName, value) {
            Object.defineProperty(obj, propName, {
                enumerable: false,
                configurable: true,
                writable: true,
                value: value
            });
        };
}
