"use strict";


class EventEmitter {
	constructor() {
		SyncNode.addNE(this, '__eventHandlers', {});
	}
	on(eventName, handler) {
		if(!this.__eventHandlers[eventName]) this.__eventHandlers[eventName] = {};
		this.__eventHandlers[eventName][handler] = handler;
	}
	emit(eventName) {
		var handlers = this.__eventHandlers[eventName] || {};
		var args = new Array(arguments.length-1);
		for(var i = 1; i < arguments.length; ++i) {
			args[i-1] = arguments[i];
		}
		Object.keys(handlers).forEach((key) => { handlers[key].apply(null, args); });
	}
}

var syncNodeIdCounterForDebugging = 0;
class SyncNode extends EventEmitter {
	constructor(obj) {
		super();

		obj = obj || {};
		SyncNode.addNE(this, '__syncNodeId', syncNodeIdCounterForDebugging++);
		SyncNode.addNE(this, '__isUpdatesDisabled', false);

		Object.keys(obj).forEach((propName) => {
			var propValue = obj[propName];
			if (typeof propValue === 'object' && !Number.isNaN(propValue)) {
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
			if(!this.__isUpdatesDisabled) {
				var newUpdated = this;
				var newMerge = {};
				newMerge[propName] = merge;
				if(updated.version) { 
					this.version = updated.version;
				} else {
					this.version = SyncNode.guidShort();
				}
				newMerge.version = this.version;
				this.emit('updated', newUpdated, newMerge);
			}
		}
	}
	set(key, val) { //obj, optionalVal) {
		// Allow for old style setting: set(propName, value)
		// if(typeof obj === 'string') {
		// 	var property = obj;
		// 	obj = {};
		// 	obj[property] = optionalVal; 
		// }	

		// if(!this.__isUpdatesDisabled) obj.version = SyncNode.guidShort();

		// Object.keys(obj).forEach((key) => {
		// 	var val = obj[key];
		// 	if(val && typeof val === 'object') {				
		// 		var className = val.constructor.toString().match(/\w+/g)[1];
		// 		if (className !== 'SyncNode') {
		// 			val = new SyncNode(val);
		// 			SyncNode.addNE(val, 'parent', this);
		// 			val.on('updated', this.createOnUpdated(key));
		// 		}
		// 		val.parent = this;
		// 	}
		// 	this[key] = val;
		// });

		if(this[key] !== val) {
			this[key] = val;
			if(!this.__isUpdatesDisabled) {
				this.version = SyncNode.guidShort();
				var merge = {};
				merge[key] = val;
				merge.version = this.version;
				this.emit('updated', this, merge);
			}
		} else {
			console.log('Values are equal', key, this[key], val);
		}	
		
		return this;
	}
	merge(merge, disableUpdates) {
		console.log('remember to update version on remove', disableUpdates);
		this.__isUpdatesDisabled = disableUpdates;
		Object.keys(merge).forEach((key) => {
			if (key === '__remove') {
				var propToRemove = merge[key];
				delete this[propToRemove];
				if(!this.__isUpdatesDisabled) { 
					this.version = SyncNode.guidShort();
					merge.version = this.version;
				}
			} else {
				var nextNode = this[key];			
				if (!nextNode || typeof nextNode !== 'object') {
					console.log('here1', this.__isUpdatesDisabled);
					this.set(key, merge[key]);
				}
				else {
					nextNode.merge(merge[key], disableUpdates);				
				}
			}
		});
		if(this.__isUpdatesDisabled) { 
			this.version = merge.version;			
		}
		this.__isUpdatesDisabled = false;

		this.emit('updated', this, merge);
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

	static s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}

	static guidShort() {
		return SyncNode.s4() + SyncNode.s4();
	}
	static guid() {
		return SyncNode.s4() + SyncNode.s4() + '-' + SyncNode.s4() + '-' + SyncNode.s4() + '-' +
			SyncNode.s4() + '-' + SyncNode.s4() + SyncNode.s4() + SyncNode.s4();
	}

}
