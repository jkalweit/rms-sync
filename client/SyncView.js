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
		return SV.getPropertyHelper(obj, path.split('.'));
	}

	static getPropertyHelper(obj, split) {
		if(split.length === 1) return obj[split[0]];
		return SV.getPropertyHelper(obj[split[0]], split.slice(1, split.length));
	}

	static inject(template, data) {
		template = template.replace(/checked="{{([\w\.]*)}}"/g, function(m, key) {
			return SV.getProperty(data, key) ? 'checked' : '';
		});

		return template.replace(/{{([\w\.]*)}}/g, function(m, key) {
			return SV.getProperty(data, key);
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

		// proto.attachedCallback = function() {
		// 	this.refreshUI();
		// };

		// proto.update = function(data) {
		// 	// Check immutable data for equality
		// 	if (this.data.lastModified !== data.lastModified) {
		// 		console.log('          Data is different!', data);
		// 		this.data = data;
		// 		this.refreshUI();
		// 	}
		// }

		// proto.refreshUI = function() {
		// 	var clone = document.importNode(this.template.content, true);
		// 	var forloops = clone.querySelectorAll('for');
		// 	for(var i = 0; i < forloops.length; i++) {
		// 		var df = document.createDocumentFragment();
		// 		var loopElem = forloops[i];
		// 		var loopAttrib = loopElem.getAttribute('loop');
		// 		var matches = /([\w]*),\s([\w]*)\sin\s([\w\.]*)/.exec(loopAttrib);
		// 		var items = getProperty(this.data, matches[3]);
		// 		var arr = toArray(items);
		// 		console.log('items', arr);
		// 		arr.forEach((item) => {
		// 			var loopClone = document.importNode(loopElem, true);
		// 			//var looped = inject(forloops[i].innerHtml, item);
		// 			console.log('loopClone', SV.inject(loopClone.innerHTML, item));
		// 			df.innerHTML += SV.inject(loopClone.innerHTML, item);
		// 		});
		// 		console.log('df', df.innerHTML);
		// 		//clone.replaceChild(clone, df);
		// 	}
		// 	console.log('forloops', forloops);
		// 	this.innerHTML = '';
		// 	this.appendChild(clone);
		// 	var html = this.innerHTML;
		// 	html = SV.inject(html, this.data);
		// 	this.innerHTML = html;
		// }

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
		var result;
		if(Array.isArray(obj)) {
			result = obj.slice();
		} else {
			result = [];
			if(!obj) return result;
			Object.keys(obj).forEach(function(key) {
				if (key !== 'lastModified' && key != 'key') {
					result.push(obj[key]);
				}
			});
		}

		if(sortField) {
			result.sort(function (a, b) {
				var a1 = a[sortField];
				var b1 = b[sortField];
				if(typeof a1 === 'string') a1 = a1.toLowerCase();
				if(typeof b1 === 'string') b1 = b1.toLowerCase();
				if (a1 < b1)
					return reverse ? 1 : -1;
				if (a1 > b1)
					return reverse ? -1 : 1;
				return 0;
			});
		}
		return result;
	}

	static getByKey(obj, key) {
		if(Array.isArray(obj)) {
			for(var i = 0; i < obj.length; i++) {
				if(obj[i].key === key) return obj[i];
			}
		} else {
			return obj[key]; 
		}
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
	
	static onLoad(callback) {
		window.addEventListener('load', (e) => {
			callback(e);
		});
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
	update(data, force) {
		if(force || this.hasChanged(data)) {
//			if(this.name) console.log(this.name + ' data changed');
			var oldData = this.data;
			this.data = data;
			this.emit('updating', data, oldData);
			if(this.render) this.render(force);
			if(this.doFlash) this.flash(); 
		}
		else {
//			if(this.name) console.log(this.name + ' DATA NO CHANGED', this.data, data);
		}
	}
	hasChanged(newData) {
		if(!this.data && !newData) {
			return false;
		}
		if((this.data && !newData) || (!this.data && newData)) { 
//			if(this.name) console.log(this.name + 'here2');
			return true;
		}
		if((typeof this.data !== 'object') && (typeof newData !== 'object')) {
//			console.log('direct comparison', this.data, newData);
			return this.data === newData;
		}
		if(!this.data.lastModified || !newData.lastModified) {
//			if(this.name) console.log(this.name + 'here3');
			return true;
		}	
//		if(this.name) console.log(this.name + 'here4', this.data.lastModified, newData.lastModified);
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
	constructor(ctor, sort, direction, element) {
		super(element);
		this.views = {};
		this.ctor = ctor;
		this.sort = sort;
		this.sortDirection = direction;
	}
	render(force) {
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
			view.update(item, force);
			previous = view;
		});
		Object.keys(this.views).forEach((key) => {
			var view = this.views[key];
			if(!SV.getByKey(this.data, view.data.key)) {
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
		this.name = 'SimpleEditInput ' + prop;
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
					console.log('	update');
					this.data.set(this.prop, value);
					this.emit('changed', value, oldValue);
				}
			}}});
	}
	focus() {
		this.input.focus();
	}
	render() {
		if(this.input.value !== this.data[this.prop])
			this.input.value = this.data[this.prop] || '';
	}
}


class EditInput extends SyncView {
	constructor(display, prop, inputStyle) {
		super();
		this.prop = prop;

		this.mainView = SV.el('div', { parent: this.node,
			events: { click: () => {
				this.isEditing = true;
				this.render();
				this.input.focus();
			} } });
		this.display = display;
		this.mainView.appendChild(this.display);

		this.editView = SV.el('div', { parent: this.node });
		this.input = SV.el('input', { parent: this.editView,
			events: { blur: () => {
				this.data.set(this.prop, this.input.value);
				this.isEditing = false;
				this.render();
			} } });
		SV.mergeMap(inputStyle || {}, this.input.style);
		this.input.style.width = 'calc(100% - 50px)';
		this.isEditing = false;
	}
	render() {
		this.display.innerHTML = this.data[this.prop];
		this.input.value = this.data[this.prop];
		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
	}
}


class Modal extends SyncView {
	constructor() {
		super();

		SV.mergeMap({
			zIndex: 2,
			position: 'fixed',
			left: 0,
			top: 0,
			width: '100vw',
			height: '100vh',
			backgroundColor: '#DDD',
			padding: '1em',
			overflowY: 'scroll'
		}, this.node.style);

		this.mainView = SV.el('div', { parent: this.node });

		this.hide();
	}
	show() {
		this.node.style.display = 'initial';
		document.body.style.overflowY = 'hidden';
	}
	hide() {
		this.node.style.display = 'none';
		document.body.style.overflowY = 'initial';	
	}
	render() {
	}
}

class Tab extends SyncView {
	constructor() {
		super();
	}
}

class TabView extends SyncView {
	constructor() {
		super();

		this.header = SV.el('div', { parent: this.node, 
			style: { 
				minHeight: '1em',
				position: 'relative',
				top: '1px',
			}
		});


		this.tabs = [];
		this.tabsContainer = SV.el('div', { parent: this.node, 
			style: { 
				minHeight: '1em',
				border: '1px solid #CCC'
			}
		});
	}
	addTab(tab) {
		var headerButton = SV.el('div', { parent: this.header, innerHTML: tab.title,
			events: { click: () => { this.showTab(tab); }},
	      		style: { 
				border: '1px solid #CCC',
		    		display: 'inline-block',
		    		padding: '.25em'
		    	}
		});
		tab.node.classList.add('hide');
		this.tabsContainer.appendChild(tab.node);
		this.tabs.push({ header: headerButton, tab: tab });
	}
	showTab(tab) {
		this.tabs.forEach((tabObj) => {
			if(tabObj.tab === tab) {
				tabObj.tab.node.classList.remove('hide');
				tabObj.header.style.border = '3px solid #CCC';
				tabObj.header.style.borderBottom = '1px solid #FFF';
			} else {
				tabObj.tab.node.classList.add('hide');
				tabObj.header.style.border = '1px solid #CCC';
				tabObj.header.style.borderBottom = 'initial';
			}
		});
	}
}



class UserInfo extends SyncView {
	constructor() {
		super();
		console.log('style', this.node.style);
		SV.mergeMap({
			float: 'right',
			margin: '3px',
			padding: '5px',
			border: '1px solid #CCC',
			borderRadius: '3px'
		}, this.node.style);
		console.log('style2', this.node.style);
		this.username = SV.el('span', {
			parent: this.node 
		});
		this.logout = SV.el('a', {
			parent: this.node,
			innerHTML: 'logout',
			href: '/logout'
		});
	}
	render() {
		this.username.innerHTML = 'Hello ' + this.data.name + ' - ';
	}
}

class ImageUploader extends SyncView {
	constructor(maxSize) {
		super();
	
		this.maxSize = maxSize | 640;

		this.addInput = SV.el('input', {
			parent: this.node,
			type: 'file',
			accept: 'image/*',
			name: 'image',
			style: {
				display: 'none',
				fontSize: '1em',
				width: 'calc(100% - 4em)'
			},
			events: { change: () => { this.add(); }}});

		this.preview = SV.el('img', { 
			parent: this.node,
			style: { width: '100%' }, 
		        events: { click: () => { this.addInput.click(); },
		       		error: (e) => { e.target.src = '/imgs/no_image.png'; }
		        }});
	}
	static src(key) {
		var k = key.replace(/:/g, '_');
		k = k.replace(/\./g, '_');
		return k;
	}
	add() {
		this.uploadPhotos(this.addInput.files[0]);
	}	
	reloadPreview() {
		this.preview.src = this.data.image ? '/images/' + this.data.image + '?' + Date.now() : '/imgs/no_image.png';
	}
	render() {
		this.reloadPreview();
	}
	uploadPhotos(file){

		// Ensure it's an image
		if(file.type.match(/image.*/)) {
			console.log('An image has been loaded');

			// Load the image
			var reader = new FileReader();
			reader.onload = (readerEvent) => {
				var image = new Image();
				image.onload = (imageEvent) => {

					// Resize the image
					var canvas = document.createElement('canvas'),
					    width = image.width,
					    height = image.height;
					if (width > height) {
						if (width > this.maxSize) {
							height *= this.maxSize / width;
							width = this.maxSize;
						}
					} else {
						if (height > this.maxSize) {
							width *= this.maxSize / height;
							height = this.maxSize;
						}
					}
					canvas.width = width;
					canvas.height = height;
					canvas.getContext('2d').drawImage(image, 0, 0, width, height);
					var dataUrl = canvas.toDataURL('image/jpeg');
					var resizedImage = this.dataURLToBlob(dataUrl);

					var form = new FormData();
					form.append('destination', ImageUploader.src(this.data.key));
					form.append('image', resizedImage);					
					var xhr = new XMLHttpRequest();
					xhr.open('POST', '/upload', true);
					xhr.responseType = 'text';
					xhr.onload = () => {
						if(xhr.readyState === xhr.DONE) {
							if(xhr.status === 200) {
								console.log('xhr.responseText', xhr.responseText);
								this.emit('uploaded', xhr.responseText);
							}
						}
					};
					xhr.send(form);	
				}
				image.src = readerEvent.target.result;
			}
			reader.readAsDataURL(file);
		}
	}


	/* Utility function to convert a canvas to a BLOB */
	dataURLToBlob(dataURL) {
		var BASE64_MARKER = ';base64,';
		if (dataURL.indexOf(BASE64_MARKER) == -1) {
			var parts = dataURL.split(',');
			var contentType = parts[0].split(':')[1];
			var raw = parts[1];

			return new Blob([raw], {type: contentType});
		}

		var parts = dataURL.split(BASE64_MARKER);
		var contentType = parts[0].split(':')[1];
		var raw = window.atob(parts[1]);
		var rawLength = raw.length;

		var uInt8Array = new Uint8Array(rawLength);

		for (var i = 0; i < rawLength; ++i) {
			uInt8Array[i] = raw.charCodeAt(i);
		}

		return new Blob([uInt8Array], {type: contentType});
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
