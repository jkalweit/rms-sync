"use strict"



class TodoList extends SyncView {
	constructor() {
		super();

		//this.name = 'TodoList';

		this.sync = new SyncNodeSocket('/memberdata', {});
		this.sync.on('updated', (data) => {
			console.log('updated!');
			if(!data.todos) data.set('todos', {});
			else this.update(data);
		});
		

		this.userinfo = new UserInfo();
		this.node.appendChild(this.userinfo.node);


		this.title = SV.el('h1', { parent: this.node, className: 'light', innerHTML: 'Todo' }); 
		
		this.newForm = SV.el('form', {
			parent: this.node,
			events: { submit: (e) => { this.addTodo(); e.preventDefault(); } }
		});
		this.newInput = SV.el('input', { parent: this.newForm,
			style: { width: 'calc(100% - 85px)', fontSize: '2em' } });
		this.newButton = SV.el('input', { parent: this.newForm, type: 'submit', value: 'Add',
			style: { width: '80px', fontSize: '2em' } });
		this.groupViews = new ViewsContainer(TodoGroup, 'text'); 
		this.groupViews.on('viewAdded', (view) => { 
			view.on('moveItem', (item) => {
				this.selectTodoGroupModal.select((group) => {
					var merge = {};
					merge[item.parent.parent.key] = { items: { __remove: item.key } };
					merge[group.key] = { items: {}};
					merge[group.key].items[item.key] = item;
					console.log('merge', merge, this.data.todos);
					this.data.todos.merge(merge);
				});
			});
		});
		this.node.appendChild(this.groupViews.node);

		this.selectTodoGroupModal = this.appendView(new SelectTodoGroupModal());
	}
	addTodo() {
		var todo = {
			key: new Date().toISOString(),
			text: this.newInput.value,
			items: {}
		};
		this.data.todos.set(todo.key, todo);
		this.newInput.value = '';
	}
	render() {
		this.userinfo.update(this.data.info);
		this.groupViews.update(this.data.todos);
		this.selectTodoGroupModal.update(this.data.todos);
	}
}


class TodoGroup extends SyncView {
	constructor() {
		super();

		//this.name = 'TodoGroup';

		this.mainView = SV.el('div', { parent: this.node });
		SV.el('button', { parent: this.mainView, innerHTML: 'X',
			style: { width: '45px', fontSize: '2em', float: 'right' },
			events: { click: () => { this.remove();  } } });
		SV.el('button', { parent: this.mainView, innerHTML: '+',
			style: { width: '45px', fontSize: '2em', float: 'right' },
			events: { click: () => { this.isEditing = true;
				this.render(); this.addItemInput.focus();  } } });
		this.editableText = new EditInput(SV.el('h1', { className: 'light' }),
				'text', { fontSize: '2em' });
		this.node.appendChild(this.editableText.node);


		this.editView = SV.el('div', { parent: this.node });

		this.newForm = SV.el('form', {
                        parent: this.editView,
                        events: { submit: (e) => { this.addItem(); e.preventDefault(); } }
                });
		this.addItemInput = SV.el('input', { parent: this.newForm,
			style: { fontSize: '1.5em', width: 'calc(100% - 100px)',
				marginBottom: '20px' } });
		SV.el('button', { parent: this.newForm, innerHTML: '-', type: 'button',
			style: { width: '45px', fontSize: '1.5em', float: 'right' },
			events: { click: (ev) => { this.isEditing = false;
				this.render(); ev.preventDefault(); } } });
		SV.el('input', { parent: this.newForm, type: 'submit', value: '+',
			style: { width: '45px', fontSize: '1.5em' } });
		this.itemViews = new ViewsContainer(TodoItem); 
		this.itemViews.on('viewAdded', (view) => {
			view.on('moveItem', (item) => { this.emit('moveItem', item); });
		});
		this.node.appendChild(this.itemViews.node);
	}
	addItem() {
		var item = {
			key: new Date().toISOString(),
			text: this.addItemInput.value,
			isComplete: false
		};
		this.data.items.set(item.key, item);
		this.addItemInput.value = '';
		this.isEditing = false;
		this.render();
	} remove() {
		if(confirm('Delete "' + this.data.text + '"?')) {
			this.data.parent.remove(this.data.key);
		}
	}
	render() {
		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
		this.editableText.update(this.data);
		this.itemViews.update(this.data.items);
	}
}



class TodoItem extends SyncView {
	constructor() {
		super();

		var view = {
			main: {
				el: 'div',
				children: {

				}
			}
		};

		this.mainView = SV.el('div', { parent: this.node });
		this.checkbox = SV.el('input', { parent: this.mainView, type: 'checkbox',
			style: { float: 'left', width: '25px', height: '25px', marginRight: '20px' },
			events: { change: () => { this.toggleIsComplete(); } } });
		SV.el('button', { parent: this.mainView, innerHTML: 'X',
			events: { click: () => { this.remove(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.moreButton = SV.el('button', { parent: this.mainView, innerHTML: 'i',
			events: { click: () => { this.isEditing = true; this.render(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.editableText = new EditInput(SV.el('h2', { className: 'light' }),
				'text', { fontSize: '1em' });
		this.mainView.appendChild(this.editableText.node);

		this.editView = SV.el('div', { parent: this.node });
		SV.el('button', { parent: this.editView, innerHTML: 'i',
			events: { click: () => { this.data.set('note', this.noteInput.value);  this.isEditing = false; this.render(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.noteInput = SV.el('textarea', { parent: this.editView, rows: '5',
			style: { width: 'calc(100% - 30px)'  } });
		SV.el('button', { parent: this.editView, className: 'btn', innerHTML: 'Move',
			style: { width: 'calc(100% - 30px)'  },
			events: { click: () => { this.emit('moveItem', this.data); }}});
	}
	remove() {
		if(this.data.isComplete || confirm('Delete this item?')) {
			this.data.parent.remove(this.data.key);
		}
	}
	toggleIsComplete() {
		this.data.set('isComplete', this.checkbox.checked);
	}
	render() {
		this.editableText.update(this.data);
		this.checkbox.checked = this.data.isComplete;
		this.editableText.display.style.textDecoration = this.data.isComplete? 'line-through' : 'none';
		this.noteInput.value = this.data.note || '';
		this.moreButton.style.backgroundColor = this.data.note ? '#77FF77' : 'inherit';

		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
	}
}

class SelectTodoGroupModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Todo Group' });
	
		this.itemsContainer = new ViewsContainer(TodoGroupSimpleView, 'text');
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (item) => {
			       if(this.selectCallBack) this.selectCallBack(item);
			       this.hide(); 
			});
		});
		this.mainView.appendChild(this.itemsContainer.node);

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });

		SV.el('button', { parent: footer, innerHTML: 'Cancel', className: 'btn btn-big cancel',
		       style: { marginTop: '1em' },	
			events: { click: () => { this.hide(); }}});
	}
	select(callback) {
		this.selectCallBack = callback;
		this.show();
	}
	hide() {
		this.selectCallBack = null;
		super.hide();
	}
	render() {
		this.itemsContainer.update(this.data);
	}
}

class TodoGroupSimpleView extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'btn btn-wide', 
			events: { click: () => { this.emit('selected', this.data); }}}));
		this.nameSpan = SV.el('span', { parent: this.node });
	}
	render() {
		this.nameSpan.innerHTML = this.data.text;
	}
}


SV.startReloader();

var t = new TodoList();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

