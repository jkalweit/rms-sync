"use strict"



class Notes extends SyncView {
	constructor() {
		super();

		//this.loginView = new Login();
		//this.node.appendChild(this.loginView.node);
		//this.loginView.on('userChanged', (user) => { this.mainView.style.display = user ? 'initial' : 'none';  });
		//this.loginView.start();


		this.mainView = el('div', { parent: this.node});

		el('h1', {
			parent: this.mainView,
			innerHTML: 'Notes',
			className: 'light' });

		this.addView = el('form', {
			parent: this.mainView,
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
		var body = this.addInput.value.trim();
		if(!body) return;
		var created = new Date().toISOString();
		var newItem = {
			key: created,
			body: body
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

		var arr = SV.toArray(filtered, 'key', 'reverse');
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
		switch(this.data.status) {
			case 'Accepted': 
				this.node.style.color = '#000';
				this.note.style.textDecoration = 'none';
				break;
			case 'Ordered': 
				this.node.style.color = '#55D';
				this.note.style.textDecoration = 'none';
				break;
			case 'Rejected':
				this.node.style.color = '#D55';
				this.note.style.textDecoration = 'line-through';
				break;
			case 'Completed':
				this.node.style.color = '#777';
				this.note.style.textDecoration = 'line-through';
				break;
			default:
				this.node.style.color = '#5D5';
				this.note.style.textDecoration = 'none';
		}
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
		this.statusButton = el('button', { parent: this.node, 
		       events: { click: this.cycleStatus.bind(this) }});	
		el('button', { parent: this.node, innerHTML: 'Delete',
			events: { click: this.remove.bind(this) }});
	}
	cycleStatus() {
		if(!this.data.status || this.data.status === 'New') {
			this.data.set('status', 'Accepted'); 
		} else if(this.data.status === 'Accepted') {
			this.data.set('status', 'Ordered');
		} else if(this.data.status === 'Ordered') {
			this.data.set('status', 'Completed');
		} else if(this.data.status === 'Completed') {
			this.data.set('status', 'Rejected');
		} else if(this.data.status === 'Rejected') {
			this.data.set('status', 'New'); 
		}
	}
	remove() {
		 if(confirm('Delete this note?')) {
		 	this.data.parent.remove(this.data.key);
			SV.sendToAdmin('Deleted note: ' + this.data.body);
		 }
	}
	render() {
		this.editBody.update(this.data);
		this.statusButton.innerHTML = this.data.status || 'New';
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
