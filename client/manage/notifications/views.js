"use strict"



class Notifications extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/data', {});
		this.sync.onUpdated((data) => {
			if(!data.notifications) data.set('notifications', {});
			else this.update(data.notifications);
		});
	
		this.mainView = SV.el('div', { parent: this.node});

		SV.el('h1', {
			parent: this.mainView,
			innerHTML: 'Notifications',
			className: 'light' });

		this.addView = SV.el('form', {
			parent: this.mainView,
		        events: {
				submit: (e) => {
					this.add();
					e.preventDefault();
				}
			}});
		this.addInput = SV.el('input', {
			parent: this.addView,
			style: {
				fontSize: '1em',
				width: 'calc(100% - 4em)'
			}});
		SV.el('input', {
			parent: this.addView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '1em',
			}});

		this.itemsContainer = new ViewsContainer(Notification);
		this.itemsContainer.node.style.marginTop = '1em';
		this.node.appendChild(this.itemsContainer.node);
	}
	add() {
		var text = this.addInput.value.trim();
		if(!text) return;
		var created = new Date().toISOString();
		var newItem = {
			key: created,
			text: text,
			acknowledgements: {}
		};
		this.data.set(newItem.key, newItem);
		this.addInput.value = '';
	}	
	render() {
		var arr = SV.toArray(this.data, 'key', 'reverse');
		this.itemsContainer.update(arr);
	}
}

class Notification extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';
		this.date = SV.el('span', {
			parent: this.node,
			style: { display: 'inline-block', width: '175px' },
		 	events: { click: () => { this.editMode = !this.editMode; this.render(); }}});
			
		this.text = SV.el('span', {
			parent: this.node,
			style: { display: 'inline-block' }});
		this.editView = this.appendView(new NotificationEdit());
		
		this.itemsContainer = new ViewsContainer(NotificationAcknowledgement);
		this.itemsContainer.node.style.marginTop = '1em';
		this.node.appendChild(this.itemsContainer.node);
	}
	render() {
		this.date.innerHTML = moment(this.data.key).format('M/D/YYYY hh:mma');
		this.text.innerHTML = this.data.text;
		this.editView.update(this.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';
		this.itemsContainer.update(this.data.acknowledgements);
	}
}

class NotificationEdit extends SyncView {
	constructor() {
		super();
		this.node.style.margin = '0.5em';
		this.editText = new SimpleEditInput('text', 'Text');
		this.node.appendChild(this.editText.node);
		SV.el('button', { parent: this.node, innerHTML: 'Delete',
			events: { click: this.remove.bind(this) }});
	}
	remove() {
		 if(confirm('Delete this notification?')) {
		 	this.data.parent.remove(this.data.key);
		 }
	}
	render() {
		this.editText.update(this.data);
	}
}

class NotificationAcknowledgement extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';
		this.date = SV.el('span', {
			parent: this.node,
			style: { display: 'inline-block', width: '175px', marginLeft: '25px' }});
			
		this.text = SV.el('span', {
			parent: this.node,
			style: { display: 'inline-block' }});
	}
	render() {
		this.text.innerHTML = this.data.key;
		this.date.innerHTML = moment(this.data.timestamp).format('M/D/YYYY hh:mma');
	}
}

SV.startReloader();

var t = new Notifications();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
