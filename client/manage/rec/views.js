"use strict"



class Reconciliation extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/data', {});
		this.sync.on('updated', (data) => {
			if(!data.reconciliations) {
				data.set('reconciliations', { tickets: {} });
			} else {
				this.update(data);
			}
		});

		
		SV.el('h1', {
			parent: this.node,
			innerHTML: 'Reconciliation' });
		this.tickets = this.appendView(new Tickets());
	}
	render() {
		this.tickets.update(this.data.reconciliations.tickets);
	}
}

class Tickets extends SyncView {
	constructor() {
		super();

		this.addView = SV.el('form', {
			parent: this.node,
			events: {
				submit: (e) => {
					this.add();
					e.preventDefault();
				}
			}});
		this.addInput = SV.el('input', {
			parent: this.addView,
			style: {
				fontSize: '2em',
				width: 'calc(100% - 3em)'
			},
			events: {
				keyup: () => { this.render(); }
			}});
		this.addButton = SV.el('input', {
			parent: this.addView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '2em',
			}});

		this.ticketsContainer = this.appendView(new ViewsContainer(TicketListItem));
		this.ticketsContainer.node.style.marginTop = '2em';
	}
	add() {
		var created = new Date().toISOString();
		var newItem = {
			key: SyncNode.guidShort(),
			created: created,
			name: this.addInput.value,
			table: '',
			orderItems: {}
		};
		newItem = this.data.set(newItem.key, newItem)[newItem.key];
		var modal = new SelectTableModal();
		this.node.appendChild(modal.node);
		modal.update(newItem);
		modal.show();
		this.addInput.value = '';
	}	
	render() {
		var filtered;
		var filterText = this.addInput.value.trim().toLowerCase();
		if(filterText) {
			filtered = SV.filterMap(this.data,
					(m) => {
						return m.name.toLowerCase().indexOf(filterText) !== -1;
					});
		} else {
			filtered = this.data;
		}

		this.addButton.disabled = filterText === '';

		this.ticketsContainer.update(filtered);
	}
}

class OptionsMenu extends SyncView {
	constructor() {
		super();
	}
	render() {
		var icon = this.data.expanded ? 'more_horiz' : 'more_vert';
		this.node.innerHTML = `<i class="material-icons">${icon}</i>`
	}
}

class SelectTableModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Table' });
		this.ticketName = SV.el('h2', { parent: this.mainView });

		var tables = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', 'Bar', 'Deck'];
		tables.forEach((table) => {
			SV.el('div', { parent: this.mainView, innerHTML: table, className: 'btn btn-wide',
				events: { click: () => { this.data.set('table', table); this.hide(); }}});
		});

		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', className: 'btn cancel',
		       style: { marginTop: '1em' },	
			events: { click: () => { this.hide(); }}});
	}
	render() {
		console.log('here', this.data);
		this.ticketName.innerHTML = this.data.name;	
	}
}

class TicketListItem extends SyncView {
	constructor() {
		super();
		this.node.className = 'btn btn-wide';
		this.node.style.padding = '0';

		this.mainView = SV.el('div', { parent: this.node, 
			style: { padding: '0.5em' },
			events: { click: () => { this.editMode = !this.editMode; this.render(); }}});

		this.options = new OptionsMenu();
		SV.mergeMap({ float: 'right' }, this.options.node.style);
		this.mainView.appendChild(this.options.node);

		this.amount = SV.el('span', { 
			parent: this.mainView,
			style: { float: 'right' }});
		this.name = SV.el('span', {
			parent: this.mainView });

		this.editMode = false;
		this.editView = this.appendView(new TicketEdit());
	}
	render() {
		var ticket = this.data;
		this.name.innerHTML = ticket.table + ' ' + ticket.name;
		this.name.style.color = ticket.isPaid ? '#44F' : '#555';
		this.editView.update(this.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';
		this.options.update({ expanded: this.editMode });
	}
}


class TicketEdit extends SyncView {
	constructor() {
		super();

		this.node.style.backgroundColor = '#FFF';
		this.node.style.padding = '1em';

		this.views = [];

		this.views.push(this.appendView(new SimpleEditInput('name', 'Name')));
		
		SV.el('button', { parent: this.node, innerHTML: 'Delete',
			style: { marginTop: '.5em' },
			events: { click: () =>{ 
				Modal.confirm('Delete ticket?', `Delete ${this.data.name}?`,
			       		() => { this.data.parent.remove(this.data.key); });
			}}});
	}
	render() {
		SyncView.updateViews(this.views, this.data);
	}
}



SV.startReloader();

var t = new Reconciliation();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

