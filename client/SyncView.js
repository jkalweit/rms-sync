"use strict"




class SV {
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
			Object.keys(obj).forEach((key) => {
				if (key !== 'version' && key !== 'lastModified' && key !== 'key') {
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


		if(!Array.isArray(arr)) arr = SV.toArray(arr);

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
			if(key !== 'version' && key !== 'key' && key !== 'lastModified' && filterFn(map[key])) {
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

	static sendEmailFromAdmin(msg) {
		io().emit('send email from admin', msg);
	}

	static normalizePhone(phone) {
		return phone.replace('-', '').replace('(', '').replace(')', '').replace('.', '').replace(' ', '').toLowerCase();
	}

	static formatCurrency(value, precision) {
		if(value === '') value = 0;
		precision = precision || 2;
		var number = (typeof value === 'string') ? parseFloat(value) : value;
		if(typeof number === 'undefined') {
			console.log('id undefined!', value);
			return '';
		}
		return number.toFixed(precision);
	}

	static iconButton(icon, options) {
		var button = SV.el('div', options);
		button.classList.add('btn');
		button.classList.add('btn-big');
		button.innerHTML = `<i class="material-icons">${icon}</i>` + button.innerHTML;
		return button;
	}

	static substr(str, char) {
		var pos = str.indexOf(char);
		if(pos !== -1) {
			return str.substr(0, pos);
		} else return str;
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
			//this.lastModified = data.lastModified;
			this.currentVersion = data ? data.version : null;
			//var oldData = this.data;
			this.data = data;
			this.emit('updating', data); //, oldData);
			if(this.render) this.render(force);
			if(this.doFlash) this.flash(); 
		}
		else {
			if(this.name) console.log(this.name + ' DATA NO CHANGED', this, this.data, data);
		}
	}
	hasChanged(newData) {

		// if(this.name) console.log(this.name + ' doing hasChanged #########################');
		if(!this.data && !newData) {
		 	if(this.name) console.log(this.name + 'here1 both are null');
		 	return false;
		}
		if((this.data && !newData) || (!this.data && newData)) { 
		// 	if(this.name) console.log(this.name + 'here2');
		 	return true;
		}

		if(this.currentVersion && newData.version) {
			//console.log('checking version #################', this.currentVersion, newData.version);
			return this.currentVersion !== newData.version;
		}


//		console.log('defaulting to true #################', this.data !== newData, this.currentVersion, newData);
		return true;
		
		// if((typeof this.data !== 'object') && (typeof newData !== 'object')) {
		// 	console.log('direct comparison', this.data, newData);
		// 	return this.data === newData;
		// }
		// if(!this.data.lastModified || !newData.lastModified) {
		// 	if(this.name) console.log(this.name + 'here3');
		// 	return true;
		// }	
		// if(this.name) console.log(this.name + 'here4', this.lastModified, newData.lastModified);
		// if(this.name) console.log(this.name + 'here5', this.currentVersion, newData.version);
		// return (this.data.version !== newData.version) || (this.currentVersion != newData.version);
		// return this.lastModified !== newData.lastModified;
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
		if(this.debug) {
			console.log('renderrrrr', this.data);
		}
		var itemsArr = SV.toArray(this.data, this.sort, this.sortDirection);
		var previous = null;
		itemsArr.forEach((item) => {
			var view  = this.views[item.key];
			if(!view) {
				if(this.debug) console.log('Adding view', item.data.info.name, this.node);
				view = new this.ctor();
				this.views[item.key] = view;
				// Attempt to preserve order
				this.node.insertBefore(view.node, previous ? previous.node.nextSibling : this.node.firstChild);
				view.update(item, force);
				if(this.debug) console.log('view node', view.node);
				this.emit('viewAdded', view);
			} else {
				view.update(item, force);
			}
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
	constructor(prop, label, options) {
		super();

		this.options = options || {};

		this.doFlash = true;
		
		this.prop = prop;
		
		if(label) {
			SV.el('span', { parent: this.node, innerHTML: label, className: 'label',
				style: { display: 'inline-block', width: '150px' }});
		}

		var elem = this.options.isTextArea ? 'textarea' : 'input';
		this.input = SV.el(elem, { parent: this.node,
			events: { blur: () => {
				var value = this.input.value;			
				if(this.options.validator && !this.options.validator(value)) {
					alert('Invalid value: "' + value + '"');
					return;
				}				
			
				if(this.options.parser) value = this.options.parser(value);
				if(this.data[this.prop] !== value) {
					var oldValue = this.data[this.prop];
					//var update = {};
					//update[this.prop] = value;
					this.data.set(this.prop, value);
					this.emit('changed', value, oldValue);
				}
			}}});
		var width = label ? 'calc(100% - 155px)' : '100%';
		this.input.style.width = width;
	}
	focus() {
		this.input.focus();
	}
	render() {
		if(this.input.value !== this.data[this.prop]) {
			var val = this.data[this.prop] || '';
			this.input.value = this.options.formatter ? this.options.formatter(val) : val; 
		}
	}

	static NumberValidator(val) {
		if(typeof val === 'number') return true;
		if(val.trim() == '') return true;
		return !isNaN(parseFloat(val));
	}
	static NumberParser(val) {
		if(typeof val === 'number') return val;
		if(val.trim() == '') return 0;
		return parseFloat(val);
	}
}


class EditInput extends SyncView {
	constructor(display, prop, inputStyle, emptyText) {
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
		//this.input.style.width = 'calc(100% - 50px)';
		this.emptyText = emptyText;
		this.isEditing = false;
	}
	render() {
		this.input.value = this.data[this.prop];
		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
			this.display.innerHTML = this.data[this.prop] || this.emptyText || '';
	}
}

class SimpleEditCheckBox extends SyncView {
	constructor(prop, label) {
		super();
		this.prop = prop;

		this.editView = SV.el('div', { parent: this.node });
		if(label) {
			SV.el('span', { parent: this.editView, innerHTML: label, className: 'label',
				style: { display: 'inline-block', width: '150px' }});
		}
		this.input = SV.el('input', { parent: this.editView, type: 'checkbox',
			style: { fontSize: '2em' },
			events: { change: () => {
				var value = this.input.checked;			
				if(this.data[this.prop] !== value) {
					var oldValue = this.data[this.prop];
					this.data.set(this.prop, value);
					this.emit('changed', value, oldValue);
				}
			}}});
	}
	render() {
		console.log('thisasdfasdf', this.input.checked, '1', this.data[this.prop], '2', this.prop, this.data);
		if(this.data[this.prop]) {
			this.input.setAttribute('checked', true);
		} else {
			this.input.removeAttribute('checked');
		}
	}
}

class SimpleEditSelect extends SyncView {
	constructor(prop, label, validator, formatter, options) {
		super();
		this.doFlash = true;
		
		this.prop = prop;

		this.editView = SV.el('div', { parent: this.node });
		if(label) {
			SV.el('span', { parent: this.editView, innerHTML: label, className: 'label',
				style: { display: 'inline-block', width: '150px' }});
		}
		var width = label ? 'calc(100% - 150px)' : '100%';
		this.input = SV.el('select', { parent: this.editView,
			style: { width: width },
			events: { blur: () => {
				var value = this.input.value;			
				if(validator && !validator(value)) {
					alert('Invalid value: "' + value + '"');
					return;
				}				
				if(formatter) value = formatter(value);
				if(this.data[this.prop] !== value) {
					var oldValue = this.data[this.prop];
					//var update = {};
					//update[this.prop] = value;
					this.data.set(this.prop, value);
					this.emit('changed', value, oldValue);
				}
			}}});
		if(options) this.updateOptions(options);
	}
	focus() {
		this.input.focus();
	}
	updateOptions(options) {
		this.input.innerHTML = '';
		SV.toArray(options).forEach((option) => {
			SV.el('option', { parent: this.input, innerHTML: option });
		});
		if(this.data) this.input.value = this.data[this.prop] || '';
	}
	render() {
		if(this.input.value !== this.data[this.prop])
			this.input.value = this.data[this.prop] || '';
	}
}



class Modal extends SyncView {
	constructor() {
		super();
		this.node.className = 'modal';

		this.mainView = SV.el('div', { parent: this.node, className: 'main-view' });
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

	static showNotification(title, message) {
		var modal = new Modal();
		modal.mainView.appendChild(SV.el('h1', { innerHTML: title }));
		modal.mainView.appendChild(SV.el('p', { innerHTML: message }));
		modal.mainView.appendChild(SV.el('button', { innerHTML: 'Ok', className: 'btn',
	       		events: { click: () => { modal.hide(); }}}));
		document.body.appendChild(modal.node);
		modal.show();
	}

	static confirm(title, message, callback) {
		var modal = new Modal();
		modal.mainView.appendChild(SV.el('h1', { innerHTML: title }));
		modal.mainView.appendChild(SV.el('p', { innerHTML: message }));
		modal.mainView.appendChild(SV.iconButton('done', { className: 'btn btn-big',
			style: { float: 'right' },
	       		events: { click: () => { modal.hide(); callback(); }}}));
		modal.mainView.appendChild(SV.el('div', { innerHTML: 'Cancel', className: 'btn btn-big',
	       		events: { click: () => { modal.hide(); }}}));
		document.body.appendChild(modal.node);
		modal.show();
	}

}

class Tab extends SyncView {
	constructor() {
		super();

		this.node.style.padding = '1em';
		this.node.style.boxShadow = '3px 3px 3px #555';
		this.node.style.backgroundColor = '#FFF';
	}
}

class TabView extends SyncView {
	constructor() {
		super();

		this.node.style.minWidth = '300px';

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
				border: '1px solid #000'
			}
		});
	}
	addTab(tab) {
		var headerButton = SV.el('div', { parent: this.header, innerHTML: tab.title,
			events: { click: () => { this.showTab(tab); }},
	      		style: { 
				border: '1px solid #555',
		    		borderBottom: '1px solid #000',
		    		display: 'inline-block',
		    		padding: '.25em',
		    		backgroundColor: '#DDD',
		    		height: '1em'
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
				tabObj.header.style.border = '1px solid #000';
				tabObj.header.style.borderBottom = '1px solid #FFF';
		    		tabObj.header.style.backgroundColor = '#FFF';
			} else {
				tabObj.tab.node.classList.add('hide');
				tabObj.header.style.border = '1px solid #555';
				tabObj.header.style.borderBottom = 'initial';
		    		tabObj.header.style.backgroundColor = '#DDD';
			}
		});
	}
}



class UserInfo extends SyncView {
	constructor() {
		super();
		SV.mergeMap({
			float: 'right',
			margin: '3px',
			padding: '5px',
			border: '1px solid #CCC',
			borderRadius: '3px'
		}, this.node.style);
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
		this.username.style.color = this.data.isStaff ? '#44F' : 'default';
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




