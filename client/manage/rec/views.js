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
		this.ticketsContainer.on('viewAdded', (view) => {
			view.on('selectTable', (ticket) => {
				this.selectTable(ticket);
			});
		});
		this.ticketsContainer.node.style.marginTop = '2em';
		
		this.selectTableModal = new SelectTableModal();
		this.node.appendChild(this.selectTableModal.node);
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
		this.selectTable(newItem);
		this.addInput.value = '';
	}	
	selectTable(ticket) {
		this.selectTableModal.update(ticket);
		this.selectTableModal.show();
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
		this.ticketName.innerHTML = this.data.name;	
	}
}

class TicketListItem extends SyncView {
	constructor() {
		super();
		this.node.className = 'ticketListItem';
		this.node.style.padding = '0';
		this.node.style.color = '#000';

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
		this.editView.on('selectTable', (ticket) => { this.emit('selectTable', ticket); });
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



class SelectMenuItemModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Menu Item' });
	
		this.itemsContainer = new ViewsContainer(MenuItem);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (menuItem) => { this.emit('selected', menuItem); this.hide(); });
		});
		this.mainView.appendChild(this.itemsContainer.node);

		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', className: 'btn cancel',
		       style: { marginTop: '1em' },	
			events: { click: () => { this.hide(); }}});
	}
	render() {
		this.itemsContainer.update(this.data);
	}
}

class MenuItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'btn btn-wide', 
			events: { click: () => { this.emit('selected', this.data); }}}));
		this.name = SV.el('span', { parent: this.node });
	}
	render() {
		this.name.innerHTML = this.data.name;
	}
}





class TicketEdit extends SyncView {
	constructor() {
		super();

		this.node.style.backgroundColor = '#FFF';
		this.node.style.padding = '1em';

		this.selectMenuItemModal = this.appendView(new SelectMenuItemModal());
		this.selectMenuItemModal.on('selected', (menuItem) => {
			this.addOrderItem(menuItem);
		});



		SV.el('button', { parent: this.node, innerHTML: 'Add Order Item', className: 'btn',
			style: { marginBottom: '.5em' },
			events: { click: () =>{ 
				this.selectMenuItemModal.show();
			}}});

		SV.el('button', { parent: this.node, innerHTML: 'More Options', className: 'btn',
			style: { marginBottom: '.5em', float: 'right' },
			events: { click: () =>{ 
				this.ticketEditDetailsModal.show();
			}}});



	
		this.orderItemEditModal = this.appendView(new OrderItemEditModal());
		this.orderItems = this.appendView(new ViewsContainer(OrderItem));
		this.orderItems.on('viewAdded', (view) => {
			view.on('selected', (orderItem) => {
				this.orderItemEditModal.update(orderItem);
				this.orderItemEditModal.show();
			});
		});

		this.ticketEditDetailsModal = this.appendView(new TicketEditDetailsModal());
	}
	addOrderItem(menuItem) {
		var orderItem = {
			key: SyncNode.guidShort(),
			name: menuItem.name,
			price: menuItem.price,
			quantity: 1,
			note: ''
		};
		this.data.orderItems.set(orderItem.key, orderItem);
	}
	render() {
		this.ticketEditDetailsModal.update(this.data);
		this.orderItems.update(this.data.orderItems);
		this.selectMenuItemModal.update(this.data.parent.parent.parent.menu.items);
	}
}

class TicketEditDetailsModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Ticket Details' });

		this.selectTable = SV.el('button', { parent: this.mainView, innerHTML: 'Table', className: 'btn',
			events: { click: () => { this.emit('selectTable', this.data); }}});
		
		this.nameInput = new SimpleEditInput('name');
		this.mainView.appendChild(this.nameInput.node);
		


		SV.el('button', { parent: this.mainView, innerHTML: 'Delete', className: 'btn',
			style: { marginTop: '.5em' },
			events: { click: () =>{ 
				Modal.confirm('Delete ticket?', `Delete ${this.data.name}?`,
			       		() => { this.data.parent.remove(this.data.key); });
			}}});
		
		SV.el('button', { parent: this.mainView, innerHTML: 'Ok', className: 'btn',
			style: { marginTop: '.5em' },
			events: { click: () => { this.hide(); }}});
	
	}
	render() {
		this.selectTable.innerHTML = this.data.table;
		this.nameInput.update(this.data);
	}
}

class OrderItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'btn btn-wide', 
			events: { click: () => { this.emit('selected', this.data); }}}));
		this.name = SV.el('span', { parent: this.node });
		this.price = SV.el('span', { parent: this.node,
	       		style: { float: 'right' }});
	}
	render() {
		this.name.innerHTML = this.data.name;
		this.price.innerHTML = SV.formatCurrency(this.data.price);
	}
}


class OrderItemEditModal extends Modal {
	constructor() {
		super();
		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Order Item' });
		this.views = [];
		this.views.push(this.appendView(new SimpleEditInput('name', 'Name'), this.mainView));
		var note = this.appendView(new SimpleEditInput('note', 'Note', null, null, true), this.mainView);
		note.input.rows = 10;
		this.views.push(note);
		this.views.push(this.appendView(new SimpleEditInput('price', 'Price'), this.mainView));
		
		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });

		SV.el('button', { parent: footer, innerHTML: 'Ok', className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
		SV.el('button', { parent: footer, innerHTML: 'Delete', className: 'btn btn-big', 
			events: { click: () => { 
					Modal.confirm('Delete Order Item', 'Delete this item?', () => {
						this.data.parent.remove(this.data.key); this.hide(); 
					});
				}
			}});
	}
	render() {
		SyncView.updateViews(this.views, this.data);
	}
}






SV.startReloader();

var t = new Reconciliation();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

