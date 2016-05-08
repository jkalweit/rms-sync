"use strict"



class List extends SyncView {
	constructor(ctor, sort, direction, element) {
		super(element);
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
				view = buildComponent(this.ctor);
				this.views[item.key] = view;
				// Attempt to preserve order
				this.node.insertBefore(view.node, previous ? previous.node.nextSibling : this.node.firstChild);
				view.update(item);
				this.emit('viewAdded', view);
			} else {
				view.update(item);
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


window.List = List;













function isCapitalized(str) { return str[0] === str[0].toUpperCase(); } 
function isTabbed(str) { return str[0] === '\t'; }

function numTabs(str) {
	var count = 0;
	for(var i = 0; i < str.length; i++) {
		if(str[i] === '\t') { count++; }
		else return count;
	}
	return count;
}

function getName(str) { 
	var result = /(\w*)/.exec(str);
	if(result) return result[1];
	else return '';
}

function getId(str) { 
	var result = /[#](\w*)/.exec(str);
	if(result) return result[1];
	else return '';
}
function getTag(str) { 
	var result = /[:](\w*)/.exec(str);
	if(result) return result[1];
	else return '';
}
function getBetween(str, startDelimiter, endDelimiter) {
	endDelimiter = endDelimiter || startDelimiter;
	var exp = `[${startDelimiter}](.*?)[${endDelimiter}]`;
	return new RegExp(exp).exec(str);
}
function getText(str) { 
	var result = getBetween(str, '\'');
	if(result) return result[1];
	else return '';
}
function getClasses(str) { 
	var result = getBetween(str, '\\[', '\\]');
	if(result) return result[1];
	else return '';
}

function getProp(str) { 
	var result = /(\w*)[:]/.exec(str);
	if(result) return result[1].trim();
	else return '';
}
function getCode(str) { 
	var result = /[:](.*)/.exec(str);
	if(result) return result[1];
	else return '';
}

function getArgs(str) { 
	var result = getBetween(str, '(', ')');
	if(result) { 
		var args = result[1].split(',');
		return args.map((arg) => { return arg.trim(); });
	}
	else return [];
}

var components = {};


function findComponents(lines) {
	var currComponent;
	var inComponent = false;
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if(trimmed !== '') {
			var tabs = numTabs(line);
			if(tabs === 0 && trimmed[0] !== '#') {
				inComponent = true;
				var componentName = getName(line);
				var classes = getClasses(line);
				currComponent = {
					name: componentName,
					classes: classes,
					ctor: new Function(`
							this.node = SV.el('div');
							this.eventHandlers = {};
						`),
					code: ''
				};

				currComponent.ctor.prototype = Object.create(SyncView.prototype);
				components[componentName] = currComponent;
			}
			else if(tabs !== 0 && inComponent) {
				currComponent.code += line + '\n';
			} else {
				inComponent = false;
			}
		}
	}
}



function parse(code, container) {

	container = container || document.body;

	var lines = code.split('\n'); 
	
	findComponents(lines);

	var componentInstance;
	var el;
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if(trimmed !== '') {
			var tabs = numTabs(line);
			if(tabs === 0 && trimmed[0] === '#') {
				var id = getId(trimmed);
				var componentName = getTag(trimmed);
				var classes = getClasses(trimmed);
				componentInstance = buildComponent(componentName, getArgs(trimmed));
				componentInstance.node.className += ' ' + classes;
				container.appendChild(componentInstance.node);
				window[id] = componentInstance;
			}			
		}
	}

}


function buildComponent(componentName, args) {


	if(typeof componentName === 'function') {
		args.unshift(null);
		var instance = new (Function.prototype.bind.apply(componentName, args));
		if(instance.init) instance.init();
		return instance;
	}


	var component = components[componentName]; 

	if(!component) {
		var ctor = window[componentName];
		args.unshift(null);
		var instance = new (Function.prototype.bind.apply(ctor, args));
		if(instance.init) instance.init();
		return instance;
	}


	var componentInstance = new component.ctor();
	componentInstance.node.className += ' ' + component.classes;
	var lines = component.code.split('\n');
	var el;
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if(trimmed !== '') {
			var tabs = numTabs(line);
			if(tabs === 1) {
				var id = getId(trimmed);
				var tag = getTag(trimmed) || 'div';
				var classes = getClasses(trimmed);
				var inner = getText(trimmed);
				
				
				if(isCapitalized(tag)) {
					el = buildComponent(tag, getArgs(trimmed));
					if(id) el.node.id = id;
					componentInstance.node.appendChild(el.node);
				} else if(tag === 'function') {
					var code = getCode(trimmed).substr(trimmed.indexOf('function') +3,trimmed.length);
					while(i+1 < lines.length && numTabs(lines[i+1]) > 1) {
						i = i+1;
						code += lines[i] + '\n';
					}
					el = new Function(code).bind(componentInstance);
				} else {

					el = SV.el(tag, { 
						parent: componentInstance.node,
						id: id, 
						className: classes, 
						innerHTML: inner 
					});
				}

				if(id) componentInstance[id] = el;
			} else if(tabs === 2) {
				var prop = getProp(trimmed);
				if(prop === 'style') {
					var style = getCode(trimmed);
					while(i+1 < lines.length && numTabs(lines[i+1]) > 1) {
						i = i+1;
						style += lines[i] + '\n';
					}
					style.replace('\n', ' ');
					var styleArr = style.split(';');
					styleArr.forEach((item) => {
						if(item === '') return;
						var pair = item.split(':');
						pair = pair.map((s) => s.trim());
						el.style[pair[0]] = pair[1];
					});

				} else if(prop === 'events') {
					var code = getCode(trimmed);
					while(i+1 < lines.length && numTabs(lines[i+1]) > 2) {
						i = i+1;
						code += lines[i] + '\n';
					}
					parseEvents(code, el, componentInstance);	

				} else if(prop === 'click') {
					var code = getCode(trimmed);
					while(i+1 < lines.length && numTabs(lines[i+1]) > 2) {
						i = i+1;
						code += lines[i] + '\n';
					}
					var fn = new Function(code).bind(componentInstance);
					el.addEventListener(prop, fn);
				}
			}			
		}
	}

	if(componentInstance.init) componentInstance.init();

	return componentInstance;
}

function parseEvents(code, el, context) {
	context = context || el;
	var lines = code.split('\n');
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var trimmed = line.trim();
		if(trimmed !== '') {
			var tabs = numTabs(line);
			if(tabs === 3) {
				var name = getName(trimmed);
				var args = getArgs(trimmed);
				var code = getCode(trimmed);
				while(i+1 < lines.length && numTabs(lines[i+1]) > 3) {
						i = i+1;
						code += lines[i] + '\n';
					}
				var fn = new Function(args, code).bind(context);
				if(el.on) {
					el.on(name, fn);
				} else {
					el.addEventListener(name, fn);
				}
			}
		}
	}
}
