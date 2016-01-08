"use strict"


class SV {
	constructor(namespace) {
		this.namespace = namespace || 'data';
	}
	startSync() {
		this.db = null;
		var sync = new SyncNodeSocket.SyncNodeSocket(this.namespace, {});


		window.onload = () => {

			if(this.onloaded) {
				this.onloaded();
			}

			sync.onUpdated((updated) => {
				this.db = updated;
				if (this.onupdated) this.onupdated();
			});

		}
	}



	static id(id, context) {
		context = context || document;
		return context.getElementById(id);
	}
	static getProperty(obj, path) {
		return getPropertyHelper(obj, path.split('.'));
	}

	static getPropertyHelper(obj, split) {
		if(split.length === 1) return obj[split[0]];
		return getPropertyHelper(obj[split[0]], split.slice(1, split.length));
	}

	static inject(template, data) {
		template = template.replace(/checked="{{([\w\.]*)}}"/g, function(m, key) {
			return getProperty(data, key) ? 'checked' : '';
		});

		return template.replace(/{{([\w\.]*)}}/g, function(m, key) {
			return getProperty(data, key);
		});
	}
	static mergeMap(source, destination) {
		Object.keys(source).forEach((key) => {
			destination[key] = source[key];
		});
	}




	static createElement(name) {

		var proto = Object.create(HTMLElement.prototype);
		proto.template = id(name);

		proto.attachedCallback = function() {
			this.refreshUI();
		};

		proto.update = function(data) {
			// Check immutable data for equality
			if (this.data.lastModified !== data.lastModified) {
				console.log('          Data is different!', data);
				this.data = data;
				this.refreshUI();
			}
		}

		proto.refreshUI = function() {
			var clone = document.importNode(this.template.content, true);
			var forloops = clone.querySelectorAll('for');
			for(var i = 0; i < forloops.length; i++) {
				var df = document.createDocumentFragment();
				var loopElem = forloops[i];
				var loopAttrib = loopElem.getAttribute('loop');
				var matches = /([\w]*),\s([\w]*)\sin\s([\w\.]*)/.exec(loopAttrib);
				var items = getProperty(this.data, matches[3]);
				var arr = toArray(items);
				console.log('items', arr);
				arr.forEach((item) => {
					var loopClone = document.importNode(loopElem, true);
					//var looped = inject(forloops[i].innerHtml, item);
					console.log('loopClone', inject(loopClone.innerHTML, item));
					df.innerHTML += inject(loopClone.innerHTML, item);
				});
				console.log('df', df.innerHTML);
				//clone.replaceChild(clone, df);
			}
			console.log('forloops', forloops);
			this.innerHTML = '';
			this.appendChild(clone);
			var html = this.innerHTML;
			html = inject(html, this.data);
			this.innerHTML = html;
		}

		var ctor = document.registerElement(name, {
			prototype: proto
		});

		return function(data) {
			var element = new ctor();
			element.data = data;
			return element;
		};
	}

	static toArray(obj, sortField, reverse) {
		var result = [];
		if(!obj) return result;
		Object.keys(obj).forEach(function(key) {
			if (key !== 'lastModified' && key != 'key') {
				result.push(obj[key]);
			}
		});

		if(sortField) {
			result.sort(function (a, b) {
				if (a[sortField].toLowerCase() < b[sortField].toLowerCase())
					return reverse ? 1 : -1;
				if (a[sortField].toLowerCase() > b[sortField].toLowerCase())
					return reverse ? -1 : 1;
				return 0;
			});
		}

		return result;
	}



	// for debugging, receive reload signals from server when source files change
	static startReloader() {
		var reloader = io();
		reloader.on('connect', () => {
			//    console.log('connected')
		});
		reloader.on('reload', function() {
			console.log('               reload!!!!');
			location.reload();
		});
	}


	static param(variable) {
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			if (pair[0] == variable) {
				return pair[1];
			}
		}
		return (false);
	}

	static updateViews(parent, views, ctor, items, itemsArr) {
		itemsArr = itemsArr || SV.toArray(items);
		itemsArr.forEach((item) => {
			var view  = views[item.key];
			if(!view) {
				view = new ctor();
				views[item.key] = view;
				parent.appendChild(view.node);
			}
			view.update(item);
		});
		Object.keys(views).forEach((key) => {
			var view = views[key];
			if(!items[view.data.key]) {
				parent.removeChild(view.node);
				delete views[view.data.key];
			}
		});
	}


	static el(name, opts) {
		opts = opts || {};
		var elem = document.createElement(name);
		Object.keys(opts).forEach((key) => {
			if(key !== 'events' && key !== 'style') {
				elem[key] = opts[key];
			}
		});
		if(opts.events) {
			Object.keys(opts.events).forEach((key) => {
				elem.addEventListener(key, opts.events[key]);
			});
		}
		if(opts.style) {
			Object.keys(opts.style).forEach((key) => {
				elem.style[key] = opts.style[key];
			});
		}
		if(opts.parent) opts.parent.appendChild(elem);
		return elem;
	}

	static group(arr, prop, groupVals) {
		var groups = {};

		if(typeof groupVals === 'array') {
			groupVals.forEach((groupVal) => {
				groups[groupVal] = { key: groupVal };
			});
		}



		arr.forEach(function (item) {
			var val;
			if(typeof prop === 'function') {
				val = prop(item);
			} else {
				val = item[prop];
			}

			if(!groups[val]) groups[val] = { key: val };
			groups[val][item.key] = item;
		});

		return groups;
	}

	static getDayOfWeek(day, mdate) {
		mdate = mdate || moment();
		var sunday = mdate.startOf('day').subtract(mdate.day(), 'day');
		return sunday.add(day, 'day');
	}

	static filterMap(map, filterFn) {
		var result = {};
		Object.keys(map).forEach(key => {
			if(key !== 'key' && key !== 'lastModified' && filterFn(map[key])) {
				result[key] = map[key];
			}
		});
		return result;
	}


  	static arrayContains(list, value) {
      		for (var i = 0; i < list.length; ++i) {
          		if (list[i] === value)
              		return true;
      		}
      		return false;
  	}

	static flash(elem) {
		elem.classList.add('flash');
		setTimeout(() => { elem.classList.remove('flash'); }, 500);
	}


	static sendText(msg) {
		io().emit('send text', msg);
	}

	static sendToAdmin(body) {
		io().emit('send text to admin', body);
	}

	static normalizePhone(phone) {
		return phone.replace('-', '').replace('(', '').replace(')', '').replace('.', '').replace(' ', '').toLowerCase();
	}
}










class SyncView {
	constructor(content) {
		if(content instanceof HTMLElement) {
			this.node = content;
		} else {
			this.node = SV.el('div', { innerHTML: content || ''});
		}
		this.eventHandlers = {};
	}
	appendView(syncview, parent) {
		(parent || this.node).appendChild(syncview.node);
		return syncview;
	}
	static updateViews(views, data) {
		views.forEach(view => { view.update(data); });
	}
	update(data) {
		if(this.hasChanged(data)) {
			this.data = data;
			if(this.render) this.render();
			if(this.doFlash) this.flash(); 
		}
	}
	hasChanged(newData) {
		if(!this.data && !newData) return false;
		if((this.data && !newData) || (!this.data && newData)) return true;
		if((typeof this.data !== 'object') && (typeof newData !== 'object')) {
			console.log('direct comparison', this.data, newData);
			return this.data === newData;
		}
		if(!this.data.lastModified || !newData.lastModified) return true;
		return this.data.lastModified !== newData.lastModified;
	}
	on(eventName, handler) {
		if(!this.eventHandlers[eventName]) this.eventHandlers[eventName] = [];
		this.eventHandlers[eventName].push(handler);
	}
	emit(eventName) {
		var handlers = this.eventHandlers[eventName] || [];
		var args = new Array(arguments.length-1);
		for(var i = 1; i < arguments.length; ++i) {
			args[i-1] = arguments[i];
		}
		handlers.forEach(handler => { handler.apply(null, args); });
	}
	flash() {
		// to visualize changes for debugging
		SV.flash(this.node);
	}
}



class ViewsContainer extends SyncView {
	constructor(ctor, sort, direction) {
		super();
		this.views = {};
		this.ctor = ctor;
		this.sort = sort;
		this.sortDirection = direction;
	}
	render() {
		var itemsArr = SV.toArray(this.data, this.sort, this.sortDirection);
		var previous = null;
		itemsArr.forEach((item) => {
			var view  = this.views[item.key];
			if(!view) {
				view = new this.ctor();
				this.views[item.key] = view;
				// Attempt to preserve order
				this.node.insertBefore(view.node, previous ? previous.node.nextSibling : this.node.firstChild);
				this.emit('viewAdded', view);
			}
			view.update(item);
			previous = view;
		});
		Object.keys(this.views).forEach((key) => {
			var view = this.views[key];
			if(!this.data[view.data.key]) {
				this.node.removeChild(view.node);
				delete this.views[view.data.key];
				this.emit('removedView', view);
			}
		});
	}
}



class SimpleEditInput extends SyncView {
	constructor(prop, label, validator, formatter) {
		super();
		this.doFlash = true;
		
		this.prop = prop;

		var el = SV.el;

		this.editView = el('div', { parent: this.node });
		if(label) {
			el('span', { parent: this.editView, innerHTML: label,
				style: { display: 'inline-block', width: '100px' }});
		}
		this.input = el('input', { parent: this.editView,
			style: { width: 'calc(100% - 110px)' },
			events: { blur: () => {
				var value = this.input.value;			
				if(validator && !validator(value)) {
					alert('Invalid value: "' + value + '"');
					return;
				}				
				if(formatter) value = formatter(value);
				if(this.data[this.prop] !== value) {
					var oldValue = this.data[this.prop];
					this.data.set(this.prop, value);
					this.emit('changed', value, oldValue);
				}
			}}});
	}
	hasChanged(newData) {
		// custom hasChanged overrides super class
		if(this.data && newData) return this.data[this.prop] !== newData[this.prop];
		else return this.data !== newData;
	}
	focus() {
		this.input.focus();
	}
	render() {
		this.input.value = this.data[this.prop] || '';
	}
}



//    Utils.group = group;
//    function formatCurrency(value, precision) {
//        if (precision === void 0) { precision = 2; }
//        var number = (typeof value === 'string') ? parseInt(value) : value;
//        return number.toFixed(precision);
//    }
//    Utils.formatCurrency = formatCurrency;
//    function roundToTwo(num) {
//        return +(Math.round((num.toString() + 'e+2')) + "e-2");
//    }
//    Utils.roundToTwo = roundToTwo;
//    function snapToGrid(val, grid) {
//        var offset = val % grid;
//        if (offset < (grid / 2))
//            return val - offset;
//        else
//            return val + (grid - offset);
//    }
//    Utils.snapToGrid = snapToGrid;
//    function formatDateFromKey(key) {
//        //var date = Date.parse(key);
//        //console.log('date2', date.toString(1));
//    }
//    function mutableCopy(obj) {
//        return JSON.parse(JSON.stringify(obj));
//    }
//    Utils.mutableCopy = mutableCopy;
