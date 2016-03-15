"use strict"



class LocalSyncNode extends SyncNode  {
	constructor(id) {
		var data = JSON.parse(localStorage.getItem(id));
		super(data);
		this.on('updated', () => {
			localStorage.setItem(id, JSON.stringify(this));
		});
	}
}

class UserListItem extends SyncView {
	constructor() {
		super(SV.el('option'));
	}
	render() {
		this.node.innerHTML = this.data.data.info.name;
	}
}


class ReconciliationModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Reconciliation' });

		
		this.nameInput = this.appendView(new SimpleEditInput('name', 'Name'), this.mainView);
		this.beginningDrawer = this.appendView(new SimpleEditInput('beginning', 'Beginning Drawer', 
					SimpleEditInput.NumberValidator, SimpleEditInput.NumberFormatter), this.mainView);
		this.endingDrawer = this.appendView(new SimpleEditInput('ending', 'Ending Drawer', 
					SimpleEditInput.NumberValidator, SimpleEditInput.NumberFormatter), this.mainView);
		this.difference = SV.el('div', { parent: this.mainView });

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });


		SV.iconButton('done', { parent: footer, className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
	}
	updateCalculations() {
		console.log('drawer', this.data.drawer);
		this.difference.innerHTML = this.data.drawer.ending - this.data.drawer.beginning;
	}
	render() {
		if(!this.data.drawer) this.data.set('drawer', {
			beginning: 0,
			ending: 0
		});
		this.nameInput.update(this.data);
		this.beginningDrawer.update(this.data.drawer);
		this.endingDrawer.update(this.data.drawer);
		this.updateCalculations();
	}
}



class Reconciliation extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/data', {});
		this.sync.on('updated', (data) => {
			if(!data.reconciliations) {
				data.set('reconciliations', { 
					tickets: {}, 
					totals: { food: 0, tax: 0, alcohol: 0, total: 0 }});
			} else {
				this.update(data);
			}
		});


		window.membersSync = new SyncNodeSocket('/members', {});
		window.membersSync.on('updated', (data) => {
			this.users = SV.filterMap(data, (member) => { return member.data.info.isStaff });
			// this.users['default'] = { key: 'default', data: { info: { name: '' }}};
			this.render();
		});


		window.recSettings = new LocalSyncNode('recSettings');	

		this.currentUserSelect = SV.el('select', { parent: this.node, 
			value: window.recSettings.currentUser,
			style: { float: 'right' }});
		this.usersContainer = new ViewsContainer(UserListItem, null, null, this.currentUserSelect);		
	
		this.currentUserSelect.addEventListener('change', () => {
			window.recSettings.set('currentUser', this.currentUserSelect.value);
			this.render();
		});

		SV.el('h1', {
			parent: this.node,
			innerHTML: 'Reconciliation' });
		this.tickets = this.appendView(new Tickets());
		this.tickets.on('totalsChanged', () => { this.updateTotals(); });
		
	
		var table = SV.el('table', { parent: this.node, 
	       		style: { float: 'right', marginRight: '9.25em', marginTop: '2em' }});	
	
		var row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Food',
	       		style: { textAlign: 'right' }});
		this.food = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
		
		row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Tax',
	       		style: { textAlign: 'right' }});
		this.tax = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
		
		row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Alcohol',
	       		style: { textAlign: 'right' }});
		this.alcohol = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
		
		row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Total',
	       		style: { textAlign: 'right' }});
		this.total = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});

		SV.el('div', { parent: this.node, className: 'btn', innerHTML: 'Reconcile',
			events: { click: () => { this.recModal.show(); }}});

		this.recModal = this.appendView(new ReconciliationModal());

	}
	updateTotals() {
		var totals = { food: 0, tax: 0, alcohol: 0, total: 0 };
		var tickets = SV.toArray(this.data.reconciliations.tickets).forEach((ticket) => {
			var ticketTotals = TicketEdit.getTotals(ticket);
			totals.food += ticketTotals.food;
			totals.tax += ticketTotals.tax;
			totals.alcohol += ticketTotals.alcohol;
			totals.total += ticketTotals.total;
		});
		this.data.reconciliations.set('totals', totals);
	}
	render() {
		this.usersContainer.update(this.users);
		this.currentUserSelect.value = window.recSettings.currentUser;
		this.tickets.update(this.data.reconciliations.tickets);

		this.food.innerHTML = SV.formatCurrency(this.data.reconciliations.totals.food);
		this.tax.innerHTML = SV.formatCurrency(this.data.reconciliations.totals.tax);
		this.alcohol.innerHTML = SV.formatCurrency(this.data.reconciliations.totals.alcohol);
		this.total.innerHTML = SV.formatCurrency(this.data.reconciliations.totals.total);
		this.recModal.update(this.data);
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
				width: 'calc(100% - 85px)'
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
				width: '80px'
			}});

		this.hidePaid = true;
		this.hidePaidButton = SV.el('div', { parent: this.node, className: 'btn',
			events: { click: () => { this.hidePaid = !this.hidePaid; this.render(); }}});

		this.ticketsContainer = this.appendView(new ViewsContainer(TicketListItem));
		this.ticketsContainer.on('viewAdded', (view) => {
			view.on('selectTable', (ticket) => {
				this.selectTable(ticket);
			});
			view.on('totalsChanged', (ticket) => {
				this.emit('totalsChanged', ticket);
			});
			if(view.data.key === this.newTicketKey) {
				// We just added this ticket, so display it in edit mode and store so we can scroll to it:
				this.newTicketView = view;
				this.newTicketView.toggleEditMode(); 
				this.newTicketView.node.scrollIntoView();	
			}
		});
		this.ticketsContainer.node.style.marginTop = '2em';
		
		this.selectTableModal = new SelectTableModal();
		this.node.appendChild(this.selectTableModal.node);
	}
	add() {
		var newItem = {
			key: SyncNode.guidShort(),
			addedAt: new Date().toISOString(),
			addedBy: window.recSettings.currentUser,
			name: this.addInput.value,
			table: '',
			orderItems: {},
			paymentStatus: 'Unpaid',
			totals: { food: 0, tax: 0, alcohol: 0, total: 0 }
		};
		this.addInput.value = '';
		this.render(); // force render after clearing filter (addInput) so we can scollIntoView to this.newTicketView

		this.newTicketKey = newItem.key;
		newItem = this.data.set(newItem.key, newItem)[newItem.key];
		this.selectTable(newItem);
	}	
	selectTable(ticket) {
		this.selectTableModal.update(ticket);
		this.selectTableModal.show();
	}
	render() {
		this.ticketsContainer.update(this.data);
		
		this.hidePaidButton.innerHTML = this.hidePaid ? 'Paid Tickets: Hidden' :  'Paid Tickets: Shown';

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

		SV.toArray(this.ticketsContainer.views).forEach((view) => {
			

			if(this.hidePaid && view.data.paymentStatus !== 'Unpaid') {
				view.node.style.display = 'none';
			} else {
				view.node.style.display = filtered[view.data.key] ? 'block' : 'none';
			}
		});

		this.addButton.disabled = filterText === '';


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
		this.node.className = 'ticket-list-item';
		this.node.style.padding = '0';
		this.node.style.color = '#000';

		this.mainView = SV.el('div', { parent: this.node, 
			style: { padding: '0.5em' },
			events: { click: () => { this.toggleEditMode(); }}});

		this.options = new OptionsMenu();
		SV.mergeMap({ float: 'right' }, this.options.node.style);
		this.mainView.appendChild(this.options.node);

		this.amount = SV.el('span', { 
			parent: this.mainView,
			style: { float: 'right' }});
		this.name = SV.el('span', {
			parent: this.mainView });
		this.total = SV.el('span', {
			parent: this.mainView,
	       		style: { float: 'right', color: '#444' }});
		this.lastOrderTime = SV.el('span', {
			parent: this.mainView,
	       		style: { fontStyle: 'italic', color: '#444', marginRight: '2em', float: 'right' }});

		this.editMode = false;
		this.editView = this.appendView(new TicketEdit());
		this.editView.on('selectTable', (ticket) => { this.emit('selectTable', ticket); });
		this.editView.on('totalsChanged', (ticket) => { 
			this.emit('totalsChanged', ticket); 
			this.updateLastOrderTime(); 
		});
	}
	toggleEditMode() {
		this.editMode = !this.editMode; this.render();
	}
	updateLastOrderTime() {
		var lastOrderItem;
		SV.toArray(this.data.orderItems).forEach((orderItem) => {
			if(!lastOrderItem || orderItem.addedAt > lastOrderItem.addedAt) {
				lastOrderItem = orderItem;
			}
		});
		this.lastOrderTime.innerHTML = lastOrderItem ? moment(lastOrderItem.addedAt).from(moment()) : 'no orders';
	}
	render() {
		var ticket = this.data;
	
		if(ticket.paymentStatus === 'Unpaid') {
			this.node.style.backgroundColor = '#FFF';
		} else {			
			this.node.style.backgroundColor = '#BBB';
		}

		this.name.innerHTML = ticket.table + ' ' + ticket.name;
		this.name.style.color = ticket.paymentStatus === 'Unpaid' ? '#44F' : '#555';
		this.total.innerHTML = SV.formatCurrency(ticket.totals.total);
		this.editView.update(this.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';
		this.options.update({ expanded: this.editMode });

		if(!this.lastOrderTimeTimer) {
			this.updateLastOrderTime();
			this.lastOrderTimeTimer = setInterval(() => { this.updateLastOrderTime(); }, 30000);
		}
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

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });

		SV.el('button', { parent: footer, innerHTML: 'Cancel', className: 'btn btn-big cancel',
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
		this.price = SV.el('span', { parent: this.node, 
			style: { float: 'right' }});
	}
	render() {
		this.name.innerHTML = this.data.name;
		this.price.innerHTML = SV.formatCurrency(this.data.price);
	}
}





class TicketEdit extends SyncView {
	constructor() {
		super();

		this.node.style.padding = '1em';
		this.node.classList.add('group');

		this.selectMenuItemModal = this.appendView(new SelectMenuItemModal());
		this.selectMenuItemModal.on('selected', (menuItem) => {
			this.addOrderItem(menuItem);
		});




	
		this.orderItemEditModal = this.appendView(new OrderItemEditModal());
		this.orderItemEditModal.on('totalChanged', (orderItem) => {
			this.updateTotals();
			alertify.success('Changed <b>' + orderItem.name + '</b>');
		});
		this.orderItemEditModal.on('deleted', (orderItem) => {
			this.updateTotals();
			alertify.success('Deleted <b>' + orderItem.name + '</b> from ' + this.data.name);
		});
		this.orderItems = this.appendView(new ViewsContainer(OrderItem));
		this.orderItems.on('viewAdded', (view) => {
			view.on('selected', (orderItem) => {
				this.orderItemEditModal.update(orderItem);
				this.orderItemEditModal.show();
				this.orderItemEditModal.note.focus();
			});
			view.on('addAgain', (orderItem) => {
				this.addOrderItem(orderItem, orderItem.quantity);
			});
		});


		var controls = SV.el('div', { parent: this.node,
	       		style: { marginTop: '2em', overflow: 'hidden', float: 'right' }});	
			
		var btn = SV.iconButton('more_vert', { parent: controls, 
			style: { float: 'right' },
			events: { click: () =>{ 
				this.ticketEditDetailsModal.show();
			}}});
		btn.classList.remove('btn-big');
	
		btn = SV.iconButton('add', { parent: controls, 
			style: { float: 'right' },
			events: { click: () =>{ 
				this.selectMenuItemModal.show();
			}}});
		btn.classList.remove('btn-big');


		this.paymentButton = SV.el('div', { parent: this.node, className: 'btn', 
			style: { float: 'left', marginTop: '2em' },
	       		events: { click: () => { this.cyclePaymentStatus(); }}});

		this.printReceiptButton = SV.el('div', { parent: this.node, className: 'btn', innerHTML: 'Print Receipt', 
			style: { float: 'left', marginTop: '2em' },
	       		events: { click: () => { this.printReceipt(); }}});


		var totals = SV.el('div', { parent: this.node,
	       		style: { marginTop: '2em', marginRight: '.8em', float: 'right', overflow: 'hidden' }});	
		
		var table = SV.el('table', { parent: totals, 
	       		style: { float: 'right' }});	
	
		var row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Food',
	       		style: { textAlign: 'right' }});
		this.food = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
		
		row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Tax',
	       		style: { textAlign: 'right' }});
		this.tax = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
		
		row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Alcohol',
	       		style: { textAlign: 'right' }});
		this.alcohol = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
		
		row = SV.el('tr', { parent: table });
		SV.el('td', { parent: row, innerHTML: 'Total',
	       		style: { textAlign: 'right' }});
		this.total = SV.el('td', { parent: row,
	       		style: { textAlign: 'right', width: '5em' }});
	




		this.ticketEditDetailsModal = this.appendView(new TicketEditDetailsModal());
		this.ticketEditDetailsModal.on('deleted', (ticket) => {
			this.emit('totalsChanged');
		});
		this.ticketEditDetailsModal.on('selectTable', (ticket) => {
			this.emit('selectTable', ticket);
		});
	}
	printReceipt() {
		console.log('printing receipt');
		var html = `<html>
				<head>
					<style>
						html, body {
							margin: 0;
							padding: 0;
							font-family: sans-serif;
						}
					</style>
				</head>
				<body>
					Receipt: ${this.data.name}`;

		SV.toArray(this.data.orderItems).forEach((orderItem) => {
			html += `<div style="clear: both; overflow: hidden">
					<p style="float: left">${orderItem.name}</p>
					<p style="float: right">${orderItem.price}</p>
				</div>`;
		});
		html += `</body></html>`;

		io().emit('print', html);
	}
	static getTotals(ticket) {
		var totals = {
			food: 0,
			tax: 0,
			alcohol: 0,
			total: 0
		};

		SV.toArray(ticket.orderItems).forEach((item) => {
			var amount = item.price * item.quantity;
			if(item.taxType === 'Included') {
				totals.alcohol += amount;
			} else  {
				totals.food += amount;
			}
		});

		totals.tax = totals.food * 0.09;
		totals.total = totals.food + totals.tax + totals.alcohol;

		return totals;
	}
	updateTotals() {
		var totals = TicketEdit.getTotals(this.data);	
		this.data.set('totals', totals);
		this.emit('totalsChanged', this.data);
	}
	addOrderItem(menuItem, quantity) {
		quantity = quantity || 1;
		var orderItem = {
			key: SyncNode.guidShort(),
			addedAt: new Date().toISOString(),
			addedBy: window.recSettings.currentUser,
			name: menuItem.name,
			price: menuItem.price,
			quantity: quantity,
			taxType: menuItem.taxType,
			note: ''
		};
		this.data.orderItems.set(orderItem.key, orderItem);
		this.updateTotals();
		//toastr.success('to ' + this.data.name, 'Added ' + orderItem.name);
		alertify.closeLogOnClick(true).maxLogItems(10);
		alertify.success('Added <b>' + orderItem.name + '</b> to ' + this.data.name + '.');
	}
	cyclePaymentStatus() {
		var status = this.data.paymentStatus;
		var newStatus;
		if(status === 'Unpaid') newStatus = 'Credit Card';
		else if(status === 'Credit Card') newStatus = 'Cash';
		else newStatus = 'Unpaid';
		this.data.set('paymentStatus', newStatus);
	}
	render() {
		
		if(this.data.paymentStatus === 'Unpaid') {
			this.node.style.backgroundColor = '#FFF';
		} else {			
			this.node.style.backgroundColor = '#DDD';
		}

		this.ticketEditDetailsModal.update(this.data);
		this.orderItems.update(this.data.orderItems);
		this.selectMenuItemModal.update(this.data.parent.parent.parent.menu.items);
		this.food.innerHTML = SV.formatCurrency(this.data.totals.food);
		this.tax.innerHTML = SV.formatCurrency(this.data.totals.tax);
		this.alcohol.innerHTML = SV.formatCurrency(this.data.totals.alcohol);
		this.total.innerHTML = SV.formatCurrency(this.data.totals.total);

		this.paymentButton.innerHTML = this.data.paymentStatus;
	}
}

class TicketEditDetailsModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Ticket Details' });

		this.selectTable = SV.el('button', { parent: this.mainView, innerHTML: 'Table', className: 'btn btn-big',
			style: { marginBottom: '1em' },
			events: { click: () => { this.emit('selectTable', this.data); }}});
		
		this.nameInput = new SimpleEditInput('name');
		this.mainView.appendChild(this.nameInput.node);
		

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });


		SV.iconButton('delete', { parent: footer,
			events: { click: () =>{ 
				Modal.confirm('Delete ticket?', `Delete ${this.data.name}?`,
			       		() => { 
						this.data.parent.remove(this.data.key); 
						this.emit('deleted', this.data);
					});
			}}});

		SV.iconButton('done', { parent: footer, className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
	}
	render() {
		this.selectTable.innerHTML = this.data.table;
		this.nameInput.update(this.data);
	}
}

class OrderItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'order-item' })); 

		this.time = SV.el('span', { parent: this.node,
			style: { display: 'block', clear: 'both', margin: '0em', padding: '0', fontStyle: 'italic', 
		       		color: '#999'}});
		this.name = SV.el('span', { parent: this.node,
	       		style: { float: 'left', clear: 'both' }});
		SV.el('div', { parent: this.node, innerHTML: `<i class="material-icons">edit</i>`,
			className: 'btn',
			style: { float: 'right', height: '100%' },
			events: { click: () => { this.emit('selected', this.data); }}});
		SV.el('div', { parent: this.node, innerHTML: `<i class="material-icons">repeat_one</i>`,
			className: 'btn',
			style: { float: 'right', height: '100%' },
			events: { click: () => { this.emit('addAgain', this.data); }}});
		this.price = SV.el('span', { parent: this.node,
	       		style: { float: 'right' }});
		
		this.note = SV.el('span', { parent: this.node,
			style: { display: 'block', float: 'left', marginLeft: '5em', fontStyle: 'italic' }});
	}
	updateTime() {
		this.time.innerHTML = moment(this.data.addedAt).from(moment());
	}
	render() {
		this.name.innerHTML = this.data.name;
		var price = SV.formatCurrency(this.data.price);
		this.price.innerHTML = (this.data.quantity != 1 ? this.data.quantity + ' x ' : '') + price;
		if(!this.timeTimer) {
			this.updateTime();
			this.timeTimer = setInterval(() => { this.updateTime(); }, 30000);
		}
		this.note.innerHTML = this.data.note;
	}
}


class OrderItemEditModal extends Modal {
	constructor() {
		super();
		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Order Item' });
	
		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });

		SV.iconButton('done', { parent: footer, className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
		SV.iconButton('delete', { parent: footer, className: 'btn btn-big', 
			events: { click: () => { 
					Modal.confirm('Delete Order Item?', this.data.name, () => {
						this.data.parent.remove(this.data.key); this.hide(); 
						this.emit('deleted', this.data);
					});
				}
			}});

		this.addedBy = SV.el('p', { parent: this.mainView });

		this.views = [];
		this.views.push(this.appendView(new SimpleEditInput('name', 'Name'), this.mainView));
		this.price = this.appendView(new SimpleEditInput('price', 'Price'), this.mainView);
		this.price.on('changed', () => { this.emit('totalChanged', this.data); });
		this.views.push(this.price);

		this.quantity = this.appendView(new SimpleEditInput('quantity', 'Quantity'), this.mainView);
		this.quantity.on('changed', () => { this.emit('totalChanged', this.data); });
		this.views.push(this.quantity);
	
		this.note = this.appendView(new SimpleEditInput('note', 'Note', null, null, true), this.mainView);
		this.note.input.rows = 10;
		this.views.push(this.note);
	}
	render() {
		var addedAt = moment(this.data.addedAt);
		this.addedBy.innerHTML = addedAt.from(moment()) + ' by ' + this.data.addedBy + ' at ' + addedAt.format('h:mm:ss a');
		SyncView.updateViews(this.views, this.data);
	}
}






SV.startReloader();

var t = new Reconciliation();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
