"use strict"

var layout = {
	left: {
		tag: 'div',
		attributes: {
			className: 'col',
			innerHTML: 'Left Testing',
			style: {
				backgroundColor: '#F00'
			}
		},
		children: {
			title: {
				tag: 'div',
				attributes: {
					innerHTML: 'Title'
				}
			}
		}
	},
	middle: {
		tag: 'div',
		attributes: {
			className: 'col',
			innerHTML: 'Right Testing',
			style: {
				backgroundColor: '#0F0'
			}
		}	
	},
	btn: {
		tag: 'button',
		attributes: {
			innerHTML: 'Do Test',
			events: {
				click: () => { this.ctx.set('count', this.ctx.count + 1); }
			}
		}
	}	
};

var parse = (tree, parent, view) => {
	Object.keys(tree).forEach((key) => {
		var curr = tree[key];
		var el = SV.el(curr.tag, curr.attributes);
		parent.appendChild(el);
		view[key] = el;
		if(curr.children) {
			parse(curr.children, el, view[key]);
		}
	});
};



class Layout extends SyncView2 {
	constructor() {
		super(SV.el('div', { className: 'container' }));

		this.left = this.appendView(new Left());
		this.appendChild(SV.el('button', { innerHTML: 'Do test', 
			events: { click: () => this.left.ctx.set('count', this.left.ctx.count + 1) }}));
	}
	render() {
	}
}


class Left extends SyncView2 {
	constructor() {
		super(SV.el('div', { className: 'col', style: { backgroundColor: '#0F0' }}),
			{ count: 0 });


		this.node.innerHTML = 'Testing...';
	}
	render() {
		this.node.innerHTML = 'Count: ' + this.ctx.count;
	}
}





class MenuItemOptions extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'container' }));



		this.list = this.appendView(new MenuItemOptionsList());
		this.list.on('newOption', () => {
			console.log('here', this.data);
			var item = {
				key: SyncNode.guidShort(),
				createdAt: new Date().toISOString(),
				name: 'Test Option',
				note: '',
				values: {}
			};
			var result = this.data.set(item.key, item)[item.key];
			this.editItem(result);
		});
		this.list.on('selected', (item) => { this.editItem(item); });

		this.details = this.appendView(new MenuItemOptionDetails());
		this.details.on('close', () => { this.selectedItem = null; this.render(); });
		this.details.on('delete', (item) => {
			Modal.confirm('Delete Menu Option?', item.name, () => {
				this.selectedItem = null;
				this.data.remove(item.key);
			});
		});
	}
	editItem(item) {
		this.selectedItem = item;
		this.render();	
	}
	render() {
		this.selectedItem = SV.toArray(this.data)[0];
		this.list.update(this.data);
		if(this.selectedItem) {
			this.selectedItem = this.data[this.selectedItem.key];
			this.details.update(this.selectedItem);
			this.details.node.style.display = 'block';
		} else {
			this.details.node.style.display = 'none';
		}
	}
}

class MenuItemOptionsList extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'left col' }));
	
		var header = SV.el('div', { parent: this.node, 
			className: 'header row' });
		SV.el('span', { parent: header, 
			innerHTML: 'Menu Item Options' });

		this.optionsView = this.appendView(new ViewsContainer(MenuItemOptionsListItem));
		this.optionsView.node.className = 'body row list scroll-y';
		this.optionsView.on('viewAdded', (view) => { view.on('selected', (item) => { this.emit('selected', item); })});

		var footer = SV.el('div', { 
			parent: this.node, 
			className: 'footer row' });
		SV.el('button', { parent: footer, innerHTML: 'New Option',
			events: { click: () => { this.emit('newOption'); }}});
	}
	render() {
		this.optionsView.update(this.data);		
	}
}

class MenuItemOptionsListItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'item', 
			events: { click: () => { this.emit('selected', this.data); }}}));
	
		this.nameSpan = SV.el('span', { parent: this.node });
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;	
	}
}

class MenuItemOptionDetails extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'details' }));

		var header = SV.el('div', { parent: this.node, className: 'header' });	
		this.nameSpan = SV.el('div', { parent: header, className: 'title' });
		var controls = SV.el('div', { parent: header, className: 'controls' });	
		SV.el('i', { parent: controls, innerHTML: 'done', className: 'touch material-icons',
			events: { click: () => { this.emit('close'); }}});
		SV.el('i', { parent: controls, innerHTML: 'delete', className: 'touch material-icons',
			events: { click: () => { this.emit('delete', this.data); }}});
		
		this.editView = SV.el('div', { parent: this.node, className: 'form' });

		var inputs = SV.el('div', { parent: this.editView, className: 'group' });
		this.nameInput = this.appendView(new SimpleEditInput('name', 'Name'), inputs);
		this.noteInput = this.appendView(new SimpleEditInput('note', 'Note'), inputs);

		this.valuesList = this.appendView(new MenuItemOptionValuesList());
		this.valuesList.on('newValue', () => {
			var item = {
				key: SyncNode.guidShort(),
				name: 'New Value'
			};
			this.data.values.set(item.key, item);
		});
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;
		this.nameInput.update(this.data);
		this.noteInput.update(this.data);
		this.valuesList.update(this.data.values);
	}
}


class MenuItemOptionValuesList extends SyncView {
	constructor() {
		super(SV.el('div', { style: { border: '1px solid rgba(0,0,0,0.54)' }}));	

		this.itemsView = this.appendView(new ViewsContainer(MenuItemOptionsListItem));
		this.itemsView.node.className = 'list scroll-y';
		this.itemsView.on('viewAdded', (view) => { view.on('selected', (item) => { this.emit('selected', item); })});

		var footer = SV.el('div', { parent: this.node, className: '' });
		SV.el('button', { parent: footer, innerHTML: 'New Option',
			events: { click: () => { this.emit('newValue'); }}});
	}
	render() {
		this.itemsView.update(this.data);		
	}
}

class MenuItemOptionValuesListItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'item', 
			events: { click: () => { this.emit('selected', this.data); }}}));
	
		this.nameSpan = SV.el('span', { parent: this.node });
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;	
	}
}



SV.startReloader();



//var view = new MenuItemOptions();
var view = new Layout();




// var sync = new SyncNodeSocket('/data', {});
// sync.on('updated', (data) => {
// 	if(!data.menu) {
// 		data.set('menu', { items: {}, itemOptions: {}});
// 	} else if(!data.menu.itemOptions) {
// 		data.menu.set('itemOptions', {});
// 	} else { 
// 		view.update(data.menu.itemOptions);
// 	}
// });



SV.onLoad(() => { 
	document.body.appendChild(view.node); 
});
