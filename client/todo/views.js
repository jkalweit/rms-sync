"use strict"

class TodoList extends SyncView {
	constructor() {
		super();
		var node = el('div', { innerHTML: `<h1 class="light">Todos</h1>` });
		this.node = node;
		this.newForm = el('form', {
			parent: node,
			events: { submit: (e) => { this.addTodo(); e.preventDefault(); } }
		});
		this.newInput = el('input', { parent: this.newForm,
			style: { width: 'calc(100% - 85px)', fontSize: '2em' } });
		this.newButton = el('input', { parent: this.newForm, type: 'submit', value: 'Add',
			style: { width: '80px', fontSize: '2em' } });
		this.todos = el('div', { parent: node });
		this.todoViews = {};
	}
	addTodo() {
		var todo = {
			key: new Date().toISOString(),
			text: this.newInput.value,
			items: {}
		};
		this.data.set(todo.key, todo);
	}
	render() {
		updateViews(this.todos, this.todoViews, Todo, this.data);
	}
}

function doMerge(source, destination) {
	Object.keys(source).forEach((key) => {
		destination[key] = source[key];
	});
}

class EditInput extends SyncView {
	constructor(display, prop, inputStyle) {
		super();
		this.prop = prop;

		this.mainView = el('div', { parent: this.node,
			events: { click: () => {
				this.isEditing = true;
				this.render();
				this.input.focus();
			} } });
		this.display = display;
		this.mainView.appendChild(this.display);

		this.editView = el('div', { parent: this.node });
		this.input = el('input', { parent: this.editView,
			events: { blur: () => {
				this.data.set(this.prop, this.input.value);
				this.isEditing = false;
				this.render();
			} } });
		doMerge(inputStyle || {}, this.input.style);
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


class Todo extends SyncView {
	constructor() {
		super();

		this.mainView = el('div', { parent: this.node });
		el('button', { parent: this.mainView, innerHTML: 'X',
			style: { width: '45px', fontSize: '2em', float: 'right' },
			events: { click: () => { this.remove();  } } });
		el('button', { parent: this.mainView, innerHTML: '+',
			style: { width: '45px', fontSize: '2em', float: 'right' },
			events: { click: () => { this.isEditing = true;
				this.render(); this.addItemInput.focus();  } } });
		this.editableText = new EditInput(el('h1', { className: 'light' }),
				'text', { fontSize: '2em' });
		this.node.appendChild(this.editableText.node);


		this.editView = el('div', { parent: this.node });

		this.newForm = el('form', {
                        parent: this.editView,
                        events: { submit: (e) => { this.addItem(); e.preventDefault(); } }
                });
		this.addItemInput = el('input', { parent: this.newForm,
			style: { fontSize: '1.5em', width: 'calc(100% - 100px)',
				marginBottom: '20px' } });
		el('button', { parent: this.newForm, innerHTML: '-', type: 'button',
			style: { width: '45px', fontSize: '1.5em', float: 'right' },
			events: { click: (ev) => { this.isEditing = false;
				this.render(); ev.preventDefault(); } } });
		el('input', { parent: this.newForm, type: 'submit', value: '+',
			style: { width: '45px', fontSize: '1.5em' } });


		this.items = el('div', {parent: this.node });
		this.itemViews = {};
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
		updateViews(this.items, this.itemViews, TodoItem, this.data.items);
	}
}



class TodoItem extends SyncView {
	constructor(data) {
		super();

		var view = {
			main: {
				el: 'div',
				children: {

				}
			}
		};

		this.mainView = el('div', { parent: this.node });
		this.checkbox = el('input', { parent: this.mainView, type: 'checkbox',
			style: { float: 'left', width: '25px', height: '25px', marginRight: '20px' },
			events: { change: () => { this.toggleIsComplete(); } } });
		el('button', { parent: this.mainView, innerHTML: 'X',
			events: { click: () => { this.remove(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.moreButton = el('button', { parent: this.mainView, innerHTML: 'i',
			events: { click: () => { this.isEditing = true; this.render(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.text = el('div', {parent: this.mainView });
		this.template = `<h2>{{text}}</h2>`;

		this.editView = el('div', { parent: this.node });
		el('button', { parent: this.editView, innerHTML: 'i',
			events: { click: () => { this.data.set('note', this.noteInput.value);  this.isEditing = false; this.render(); }},
			style: { float: 'right', fontSize: '1.5em' }});
		this.noteInput = el('textarea', { parent: this.editView, rows: '5',
			style: { width: 'calc(100% - 30px)'  } });
		this.update(data);
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
		this.text.innerHTML = inject(this.template, this.data);
		this.checkbox.checked = this.data.isComplete;
		this.text.style.textDecoration = this.data.isComplete? 'line-through' : 'none';
		this.noteInput.value = this.data.note || '';
		this.moreButton.style.backgroundColor = this.data.note ? '#77FF77' : 'inherit';

		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
	}
}



var t = new TodoList();
var onloaded = () => {
	id('container').appendChild(t.node);
	t.newInput.focus();
}
var onupdated = () => {
	t.update(this.db.todos);
};
