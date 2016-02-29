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
			if(!this.__isUpdatesDisabled) {
				var newUpdated = this;
				var newMerge = {};
				newMerge[propName] = merge;
				this.emit('updated', newUpdated, newMerge);
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
			this[key] = val;			
		});
		if(!this.__isUpdatesDisabled) {
			var merge = obj;
			var updated = this;
			this.emit('updated', updated, merge);
		}
	}
	merge(merge) {
		this.__isUpdatesDisabled = true;
		Object.keys(merge).forEach((key) => {
			if (key === '__remove') {
				var propToRemove = merge[key];
				delete this[propToRemove];
			} else {
				var nextNode = this[key];			
				if (!nextNode || typeof nextNode !== 'object') {
					var val = {};
					val[key] = merge[key];	
					this.set(val);
				}
				else {
					nextNode.merge(merge[key]);				
				}
			}
		});
		this.__isUpdatesDisabled = false;

		var newUpdated = this;
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
