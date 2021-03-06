"use strict"



class TodoList extends SyncView {
	constructor() {
		super();

		//this.name = 'TodoList';

		this.sync = new SyncNodeSocket('/memberdata', {});
		this.sync.on('updated', (data) => {
			console.log('updated!', data);
			if(!data.todos) data.set('todos', { tags: {}, groups: {} });
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
		this.groupViews = this.appendView(new ViewsContainer(TodoGroup, 'text')); 
		this.groupViews.on('viewAdded', (view) => { 
			view.on('moveItem', (item) => {
				this.selectTodoGroupModal.select((group) => {
					var merge = {};
					merge[item.parent.parent.key] = { items: { __remove: item.key } };
					merge[group.key] = { items: {}};
					merge[group.key].items[item.key] = item;
					this.data.todos.groups.merge(merge);
				});
			});
		});

		var footer = SV.el('div', { parent: this.node, className: 'footer' });
		SV.el('button', { parent: footer, className: 'btn', innerHTML: 'Edit Tags', events: { click: () => { this.todoTagsEditModal.show(); }}});

		this.todoTagsEditModal = this.appendView(new TodoTagsEditModal());
		this.todoTagsSelectModal = this.appendView(new TodoTagsSelectModal());

		this.selectTodoGroupModal = this.appendView(new SelectTodoGroupModal());

		this.selectTodoGroupModal = this.appendView(new SelectTodoGroupModal());
		SV.onLoad(() => {	
			// this.todoTagsSelectModal.show();
		});
	}
	addTodo() {
		var todo = {
			key: new Date().toISOString(),
			text: this.newInput.value,
			items: {}
		};
		this.data.todos.groups.set(todo.key, todo);
		this.newInput.value = '';
	}
	render() {
		this.userinfo.update(this.data.info);
		this.groupViews.update(this.data.todos.groups);
		this.selectTodoGroupModal.update(this.data.todos.groups);
		this.todoTagsEditModal.update(this.data.todos.tags);
		this.todoTagsSelectModal.update(this.data.todos.tags);
	}
}


class TodoTagsSelectModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Todo Tags' });

		this.itemsContainer = this.appendView(new ViewsContainer(TodoTagSelectItem), this.mainView);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (tag) => { 
				if(this.todoItem) {
					if(!this.todoItem.tags) this.todoItem.set('tags', {});
					var existing = this.getTagRef(tag.key);
					if(existing) {
						this.todoItem.tags.remove(existing.key);
					} else {
						var tagRef = {
							key: SyncNode.guidShort(),
							tagKey: tag.key
						};
						this.todoItem.tags.set(tagRef.key, tagRef);
					}
					this.render();
				};
			});
		});


		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });
		SV.el('button', { parent: footer, className: 'btn', innerHTML: 'Close', events: { click: () => { this.hide(); }}});
	}
	selectTags(todoItem) {
		this.todoItem = todoItem;
		this.render();
		this.show();
	}
	hide() {
		this.todoItem = null;
		super.hide();
	}
	getTagRef(tagKey) {
		var result = false;
		if(this.todoItem && this.todoItem.tags) {
			var tagRefs = SV.toArray(this.todoItem.tags);
			console.log('tagRefs', tagRefs);
			tagRefs.forEach((tagRef) => {
				if(tagRef.tagKey === tagKey) { 
					console.log('match!', tagRef);
					result = tagRef;
				}
			});
		}
		return result;
	}
	render() {
		this.itemsContainer.update(this.data);
		var tagViews = SV.toArray(this.itemsContainer.views);

		tagViews.forEach((view) => {
			var tagRef = this.getTagRef(view.data.key);
			console.log('tagRef', tagRef);
			view.node.style.border = tagRef ? 
			'3px solid #FFFF00' : '3px solid transparent';
		});
	}
}


class TodoTagSelectItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'group btn btn-wide', 
			style: { padding: '1em', color: '#FFF' },
		events: { click: () => { this.emit('selected', this.data); }}}));

		this.nameSpan = SV.el('span', { parent: this.node, style: { display: 'inline-block', width: '10em' }});
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;
		this.node.style.backgroundColor = this.data.backgroundColor || '#FFF';
	}
}





class TodoTagsEditModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Todo Tags' });

		this.addBox = this.appendView(new SearchBox({
			buttonText: 'Add',
			submitCB: (name) => {
				var newTag = {
					key: SyncNode.guidShort(),
			name: name
				};
				this.data.set(newTag.key, newTag);
				this.addBox.clear();
			}	
		}), this.mainView);

		this.itemsContainer = this.appendView(new ViewsContainer(TodoTagEditItem), this.mainView);


		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });
		SV.el('button', { parent: footer, className: 'btn', innerHTML: 'Close', events: { click: () => { this.hide(); }}});
	}
	render() {
		this.itemsContainer.update(this.data);
	}
}


class TodoTagEditItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'group', 
			style: { padding: '1em', color: '#FFF' }}));

		this.nameSpan = SV.el('span', { parent: this.node, style: { display: 'inline-block', width: '10em' }});

		SV.el('button', { parent: this.node, innerHTML: 'x', 
			style: { float: 'right' },
			events: { click: () => { 
				Modal.confirm('Delete Tag', 'Delete ' + this.data.name + '?', () => {
					this.data.parent.remove(this.data.key); 
				});
			}}});

		this.backgroundColor = this.appendView(new SimpleEditSelect('backgroundColor'));
		this.backgroundColor.updateOptions(['#D32F2F', '#303F9F', '#0097A7', '#00796B', '#388E3C', '#5D4037', '#616161', '#212121', '#455A64', '#512DA8', '#BA68C8', '#EF6C00', '#FF5722', '#E65100' ]);

	}
	render() {
		this.nameSpan.innerHTML = this.data.name;
		this.node.style.backgroundColor = this.data.backgroundColor || '#FFF';
		this.backgroundColor.update(this.data);
	}
}


class TodoGroup extends SyncView {
	constructor() {
		super();
		this.node.style.marginTop = '1em';

		this.node.className = 'group';
		//this.name = 'TodoGroup';

		this.mainView = SV.el('div', { parent: this.node });
		SV.el('button', { parent: this.mainView, innerHTML: 'X',
			style: { width: '45px', fontSize: '2em', float: 'right' },
			events: { click: () => { this.remove();  } } });
		SV.el('button', { parent: this.mainView, innerHTML: '+',
			style: { width: '45px', fontSize: '2em', float: 'right' },
			events: { click: () => { this.isEditing = true;
				this.render(); this.addItemInput.focus();  } } });
		this.todoCount = SV.el('span', { parent: this.node,
			style: { float: 'left', backgroundColor: '#FFF', borderRadius: '3px',
				fontSize: '1.2em',
			padding: '0.2em 0.5em', position: 'relative', top: '3px',
			marginRight: '5px' },
			events: { click: () => { this.data.set('isCollapsed', !this.data.isCollapsed); }}}); 
		this.editableText = this.appendView(new EditInput(SV.el('span', { className: 'light', style: { fontSize: '2em' }}),
					'text', { fontSize: '2em' }));



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
		this.itemViews = this.appendView(new ViewsContainer(TodoItem)); 
		this.itemViews.on('viewAdded', (view) => {
			view.on('moveItem', (item) => { this.emit('moveItem', item); });
		});
		this.itemViews.node.style.marginLeft = '2em';
	}
	addItem() {
		var item = {
			key: new Date().toISOString(),
			text: this.addItemInput.value,
			tags: {},
			isComplete: false
		};
		item = this.data.items.set(item.key, item)[item.key];
		console.log('item', item);
		this.addItemInput.value = '';
		this.isEditing = false;
		this.render();
		mainView.todoTagsSelectModal.selectTags(item);
	} remove() {
		if(confirm('Delete "' + this.data.text + '"?')) {
			this.data.parent.remove(this.data.key);
		}
	}
	render() {
		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
		this.editableText.update(this.data);
		var count = SV.toArray(this.data.items)
			.filter((item) => { return !item.isComplete; }).length;
		this.todoCount.innerHTML = count;
		this.todoCount.style.backgroundColor = count === 0 ? '#DDD' : '#FFF';
		this.todoCount.style.border = this.data.isCollapsed ? 'none' : '1px solid #00F';
		this.itemViews.update(this.data.items);
		this.itemViews.node.style.display = this.data.isCollapsed ? 'none' : 'block';
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
			style: { float: 'left', width: '25px', height: '25px', 
				marginRight: '5px', position: 'relative', top: '-4px' },
			events: { change: () => { this.toggleIsComplete(); } } });
		SV.el('button', { parent: this.mainView, innerHTML: 'X',
			events: { click: () => { this.remove(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.moreButton = SV.el('button', { parent: this.mainView, innerHTML: 'i',
			events: { click: () => { this.isEditing = true; this.render(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		SV.el('button', { parent: this.mainView, innerHTML: 'T',
			style: { float: 'right', fontSize: '1.5em' },
			events: { click: () => { 
				mainView.todoTagsSelectModal.selectTags(this.data);
			}}});
		this.tagsView = this.appendView(new ViewsContainer(TodoItemTag), this.mainView);
		this.tagsView.node.style.display = 'inline';
		this.tagsView.node.style.float = 'left';
		this.editableText = this.appendView(new EditInput(SV.el('h4', { className: 'light' }),
					'text', { fontSize: '1em' }), this.mainView);

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
		this.tagsView.update(this.data.tags);
		this.noteInput.value = this.data.note || '';
		this.moreButton.style.backgroundColor = this.data.note ? '#77FF77' : 'inherit';

		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
	}
}

class TodoItemTag extends SyncView {
	constructor() {
		super(SV.el('div', {
			style: { display: 'inline', 
				position: 'relative',
		top: '-2px',
		fontSize: '.8em',
		borderRadius: '3px',
		color: '#FFF',
		marginRight: '3px',
		padding: '0.2em' },
		events: { click: () => {  
			Modal.confirm('Remove tag?', 'Remove "' + this.tag.name + '"?',
				() => {
					this.data.parent.remove(this.data.key);
				});
		}}}));

		this.nameSpan = SV.el('span', { parent: this.node });
	}
	render() {
		this.tag = mainView.data.todos.tags[this.data.tagKey];
		this.nameSpan.innerHTML = this.tag.name;
		this.node.style.backgroundColor = this.tag.backgroundColor;
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

var mainView = new TodoList();
SV.onLoad(() => { SV.id('container').appendChild(mainView.node); });

