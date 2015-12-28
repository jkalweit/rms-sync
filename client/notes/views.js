"use strict"



class Notes extends SyncView {
	constructor() {
		super();

		el('h1', {
			parent: this.node,
			innerHTML: 'Notes',
			className: 'light' });

		this.addView = el('form', {
			parent: this.node,
		        events: {
				submit: (e) => {
					this.add();
					e.preventDefault();
				}
			}});
		this.addInput = el('input', {
			parent: this.addView,
			style: {
				fontSize: '1em',
				width: 'calc(100% - 4em)'
			},
			events: {
				keyup: () => { this.render(); }
			}});
		el('input', {
			parent: this.addView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '1em',
			}});

		this.itemsContainer = new ViewsContainer(NoteGroup);
		this.itemsContainer.node.style.marginTop = '1em';
		this.node.appendChild(this.itemsContainer.node);
	}
	add() {
		var created = new Date().toISOString();
		var newItem = {
			key: created,
			body: this.addInput.value
		};
		this.data.set(newItem.key, newItem);
		this.addInput.value = '';
		SV.sendToAdmin('Added note: ' + newItem.body);	
	}	
	render() {
		var filtered;
		var filterText = this.addInput.value.trim().toLowerCase();
		if(filterText) {
			filtered = SV.filterMap(this.data,
				(m) => { return m.body.toLowerCase().indexOf(filterText) !== -1; });
		} else {
			filtered = this.data;
		}

		var arr = SV.toArray(this.data, 'key', 'reverse');
		var groups = SV.group(arr, 
				(item) => { return moment(item.key).format('ddd MM/DD'); }, 
				[]);
		this.itemsContainer.update(groups);
	}
}

class NoteGroup extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';
		this.date = el('h4', {
			parent: this.node,
			className: 'light',
			style: { display: 'inline-block', width: '150px', marginBottom: '0.5em' }});
		this.itemsContainer = new ViewsContainer(Note, 'key', 'reverse');
		this.node.appendChild(this.itemsContainer.node);
	}
	render() {
		this.date.innerHTML = this.data.key;
		this.itemsContainer.update(this.data);
	}
}

class Note extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';
		this.date = el('span', {
			parent: this.node,
			style: { display: 'inline-block', width: '75px' },
		 	events: { click: () => { this.editMode = !this.editMode; this.render(); }}});
			
		this.note = el('span', {
			parent: this.node,
			style: { display: 'inline-block', width: 'calc(100% - 75px)' }});
		this.editView = this.appendView(new NoteEdit());
	}
	render() {
		this.date.innerHTML = moment(this.data.key).format('hh:mma');
		this.note.innerHTML = this.data.body;
		this.editView.update(this.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';
	}
}

class NoteEdit extends SyncView {
	constructor() {
		super();
		this.node.style.margin = '0.5em';
		this.editBody = new SimpleEditInput('body', 'Note');
		this.editBody.on('changed', (value, oldValue) => { SV.sendToAdmin('Note changed: ' + value); }); 
		this.node.appendChild(this.editBody.node);
		el('button', { parent: this.node, innerHTML: 'Delete',
			events: { click: this.remove.bind(this) }});
	}
	remove() {
		 if(confirm('Delete this note?')) {
		 	this.data.parent.remove(this.data.key);
			SV.sendToAdmin('Deleted note: ' + this.data.body);
		 }
	}
	render() {
		this.editBody.update(this.data);
	}
}



SV.startReloader();

var el = SV.el;

var view = new Notes();
SV.id('container').appendChild(view.node);

var sv = new SV();
sv.onupdated = () => {
	if(!sv.db.notes){
		sv.db.set('notes', { members: {} });
	} else {
		view.update(sv.db.notes);
	}
};

sv.startSync();
