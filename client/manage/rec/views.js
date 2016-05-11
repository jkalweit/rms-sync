"use strict"



class UserListItem extends SyncView {
	constructor() {
		super(SV.el('option'));
	}
	render() {
		this.node.innerHTML = this.data.data.info.name;
	}
}


class Reconciliations extends SyncView {
	constructor() {
		super();
	
		this.connectionStatus = SV.el('div', { parent: this.node, 
			style: { position: 'fixed', zIndex: '100', left: '0', right: '0', bottom: '0', height: '4em', backgroundColor: '#D00',
		       		color: '#FFF', textAlign: 'center', fontSize: '2em', paddingTop: '1em' }});

		window.sync.on('statusChanged', (path, status) => {
			if(status !== 'Connected') {
				this.connectionStatus.style.display = 'block';
				this.connectionStatus.innerHTML = 'Warning: ' + status;
			} else {
				this.connectionStatus.style.display = 'none';
			}
		});

		window.sync.on('updated', (data, merge) => {
			console.log('updated!!', data);
			if(!data.hasOwnProperty('reconciliations')) {
				data.set('reconciliations', {});
			} if(!data.hasOwnProperty('menuGrids')) {
				data.set('menuGrids', { grids: {}});
			} else {
				this.update(data);
			}
		});


		window.recSettings.on('updated', (data) => {
			this.render();
		});

		this.listView = SV.el('div', { parent: this.node });
		SV.el('h1', { parent: this.listView, innerHTML: 'Select a Reconciliation' });
		SV.el('button', { parent: this.listView, className: 'btn btn-big', innerHTML: 'Open New Reconciliation',
			events: { click: () => { this.addRec(); }}});

		this.recsView = new ViewsContainer(ReconciliationWeek, 'key', 'reverse');
		this.recsView.on('viewAdded', (view) => {
			view.on('recSelected', (rec) => {	
				window.recSettings.set('selectedRecKey', rec.key);
			});
		});
		this.listView.appendChild(this.recsView.node);

		this.detailsView = SV.el('div', { parent: this.node });
			
		this.recDetailsView = new Reconciliation();
		this.recDetailsView.on('closed', () => { window.recSettings.remove('selectedRecKey'); this.render(); });
		this.detailsView.appendChild(this.recDetailsView.node);	
		
		this.selectMenuItemModal = this.appendView(new SelectMenuItemModal());
		this.selectMenuItemGridModal = this.appendView(new SelectMenuItemGridModal());
	}
	addRec() {
		var added = new Date().toISOString();
		var now = moment();
		var name = moment(added).format('dddd MMM Do, YYYY') + ' - ' + (now.hour() < 13 ? 'Lunch' : 'Dinner');
		var newRec = {
			key: name,
			added: added,
			name: name,
			tickets: {},
			totals: { food: 0, tax: 0, alcohol: 0, total: 0 }
		};

		if(this.data.reconciliations[name]) {
			Modal.confirm('Duplicate Rec', 'There is already a rec named "' + name + '", are you sure you want to create another one?',
					() => {
						newRec.key += (' ' + now.format('h:mma'));
						newRec.name = newRec.key;
						this.data.reconciliations.set(newRec.key, newRec);
					});
		} else {
			this.data.reconciliations.set(newRec.key, newRec);
		}
	}
	render() {
		this.selectMenuItemModal.update(this.data.menu);
		this.selectMenuItemGridModal.update(this.data.menuGrids);

		var isDetailsView = window.recSettings.selectedRecKey;
		this.listView.style.display = !isDetailsView ? 'block' : 'none';
		this.detailsView.style.display = isDetailsView ? 'block' : 'none';
		
		if(isDetailsView) {
			var rec = this.data.reconciliations[window.recSettings.selectedRecKey];
			if(!rec) {
				window.recSettings.remove('selectedRecKey');
				this.render();
			} else {
				this.recDetailsView.update(rec);
			}
		} else {
			var weeks = SV.group(SV.toArray(this.data.reconciliations), (rec) => { 
				var d = moment(rec.added);
				return SV.getDayOfWeek(0, d).format('YYYY') + ' Week ' + d.week();
			});
			this.recsView.update(weeks);
		}
	}
}


class ReconciliationWeek extends SyncView {
	constructor() {
		super();
		
		this.node.className = 'group';
		this.nameSpan = SV.el('h2', { parent: this.node });

		this.recsView = this.appendView(new ViewsContainer(ReconciliationListItem));
		this.recsView.on('viewAdded', (view) => {
			view.on('selected', (rec) => {	
				this.emit('recSelected', rec);
			});
		});
	}
	render() {
		this.nameSpan.innerHTML = this.data.key;
		this.recsView.update(this.data);
	}
}




class ReconciliationListItem extends SyncView {
	constructor() {
		super();
		
		this.node.className = 'group btn btn-wide';
		this.nameSpan = SV.el('div', { parent: this.node,
			style: { float: 'left' }});
		this.total = SV.el('div', { parent: this.node, 
			style: { float: 'right' }});

		this.node.addEventListener('click', () => { this.emit('selected', this.data); });
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;
		this.total.innerHTML = SV.formatCurrency(this.data.totals.total);
	}
}



class Reconciliation extends SyncView {
	constructor() {
		super();

		
		this.currentUserSelect = SV.el('select', { parent: this.node, 
			value: window.recSettings.currentUser,
			style: { float: 'right' }});
		this.usersContainer = new ViewsContainer(UserListItem, null, null, this.currentUserSelect);		
	
		this.currentUserSelect.addEventListener('change', () => {
			window.recSettings.set('currentUser', this.currentUserSelect.value);
			this.render();
		});

		window.membersSync.on('updated', (data) => {
			this.users = SV.filterMap(data, (member) => { return member.data.info.isStaff });
			this.render();	
		});

		SV.el('h2', { parent: this.node, innerHTML: 'Reconciliation' });
		
		this.instructions = SV.el('div', { parent: this.node });
		SV.el('h1', { parent: this.instructions, innerHTML: 'First select a user.' });
		this.mainView = SV.el('div', { parent: this.node });


		this.tickets = this.appendView(new Tickets(), this.mainView);
		this.tickets.on('totalsChanged', () => { this.updateTotals(); });
		
	
		var table = SV.el('table', { parent: this.mainView, 
	       		style: { float: 'right', marginRight: '1.5em', marginTop: '2em' }});	
	
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

		var controls = SV.el('div', { parent: this.mainView, style: { marginTop: '2em', float: 'left', width: '35%' }});		
		SV.el('div', { parent: controls, className: 'btn', innerHTML: 'Reconcile',
			style: { display: 'block' },
			events: { click: () => { this.recModal.show(); }}});
		SV.el('div', { parent: controls, className: 'btn', innerHTML: 'Exit Rec',
			style: { display: 'block' },
			events: { click: () => { this.emit('closed', this.data); }}});

		this.recModal = this.appendView(new ReconciliationModal());

		this.selectTicketModal = this.appendView(new SelectTicketModal());
	}
	updateTotals() {
		var totals = { food: 0, tax: 0, alcohol: 0, total: 0 };
		var tickets = SV.toArray(this.data.tickets).forEach((ticket) => {
			var ticketTotals = TicketEdit.getTotals(ticket);
			totals.food += ticketTotals.food;
			totals.tax += ticketTotals.tax;
			totals.alcohol += ticketTotals.alcohol;
			totals.total += ticketTotals.total;
		});
		this.data.merge({ totals: totals });
	}
	render() {

		if(this.users) {
			this.usersContainer.update(this.users);
			this.currentUserSelect.value = window.recSettings.currentUser;
			this.mainView.style.display = window.recSettings.currentUser ? 'block' : 'none';
			this.instructions.style.display = !window.recSettings.currentUser ? 'block' : 'none';
		}

		if(this.data) {
			this.tickets.update(this.data.tickets);

			this.food.innerHTML = SV.formatCurrency(this.data.totals.food);
			this.tax.innerHTML = SV.formatCurrency(this.data.totals.tax);
			this.alcohol.innerHTML = SV.formatCurrency(this.data.totals.alcohol);
			this.total.innerHTML = SV.formatCurrency(this.data.totals.total);
			this.recModal.update(this.data);
			this.selectTicketModal.update(this.data.tickets);
		}
	}
}



class ReconciliationModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Reconciliation' });

		
		this.nameInput = this.appendView(new SimpleEditInput('name', 'Name'), this.mainView);
		this.nameInput.node.style.marginBottom = '2em';

		var labelWidth = '10em';
		var rowStyle = { minHeight: '2em', display: 'flex', alignItems: 'center' };
		var cellStyle = { display: 'inline-block', fontSize: '1.5em', width: '5em', textAlign: 'right', boxSizing: 'border-box' };

		var row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Beginning Cash', style: { display: 'inline-block', width: labelWidth }});
		this.beginningDrawer = new SimpleEditInput('beginning', null, 
				{ validator: SimpleEditInput.NumberValidator, 
					parser: SimpleEditInput.NumberParser,
					formatter: SV.formatCurrency });
		SV.mergeMap(cellStyle, this.beginningDrawer.input.style);
		row.appendChild(this.beginningDrawer.node);
		
		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Sales', style: { display: 'inline-block', width: labelWidth }});
		this.sales = SV.el('div', { parent: row, style: cellStyle });
	

		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Ending Cash', style: { display: 'inline-block', width: labelWidth }});
		this.endingDrawer = new SimpleEditInput('ending', null, 
				{ validator: SimpleEditInput.NumberValidator, 
					parser: SimpleEditInput.NumberParser,
					formatter: SV.formatCurrency });
		SV.mergeMap(cellStyle, this.endingDrawer.input.style);
		row.appendChild(this.endingDrawer.node);
			
		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Credit Cards', style: { display: 'inline-block', width: labelWidth }});
		this.credit = new SimpleEditInput('credit', null, 
				{ validator: SimpleEditInput.NumberValidator, 
					parser: SimpleEditInput.NumberParser,
					formatter: SV.formatCurrency });
		SV.mergeMap(cellStyle, this.credit.input.style);
		row.appendChild(this.credit.node);

		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Credit Tips', style: { display: 'inline-block', width: labelWidth }});
		this.creditTips = new SimpleEditInput('creditTips', null, 
				{ validator: SimpleEditInput.NumberValidator, 
					parser: SimpleEditInput.NumberParser,
					formatter: SV.formatCurrency });
		SV.mergeMap(cellStyle, this.creditTips.input.style);
		row.appendChild(this.creditTips.node);

		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Payouts', style: { display: 'inline-block', width: labelWidth }});
		this.payouts = new SimpleEditInput('payouts', null, 
				{ validator: SimpleEditInput.NumberValidator, 
					parser: SimpleEditInput.NumberParser,
					formatter: SV.formatCurrency });
		SV.mergeMap(cellStyle, this.payouts.input.style);
		row.appendChild(this.payouts.node);

		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Gift Cards', style: { display: 'inline-block', width: labelWidth }});
		this.giftCards = new SimpleEditInput('giftCards', null, 
				{ validator: SimpleEditInput.NumberValidator, 
					parser: SimpleEditInput.NumberParser,
					formatter: SV.formatCurrency });
		SV.mergeMap(cellStyle, this.giftCards.input.style);
		row.appendChild(this.giftCards.node);
	
		row = SV.el('div', { parent: this.mainView, className: 'group', style: rowStyle});
		SV.el('span', { parent: row, innerHTML: 'Difference', style: { display: 'inline-block', width: labelWidth }});
		this.difference = SV.el('div', { parent: row, style: cellStyle});


		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });


		SV.iconButton('done', { parent: footer, className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
	}
	updateCalculations() {
		var runningTotal = this.data.drawer.beginning || 0;
		runningTotal += this.data.totals.total;
		runningTotal -= this.data.drawer.giftCards;
		runningTotal -= this.data.drawer.payouts;
		runningTotal -= this.data.drawer.creditTips;
		runningTotal -= this.data.drawer.credit;
		this.difference.innerHTML = SV.formatCurrency(this.data.drawer.ending - runningTotal);
	}
	render() {
		if(!this.data.drawer) this.data.set('drawer', {
			beginning: 0,
			ending: 0,
			credit: 0,
			creditTips: 0,
			giftCards: 0,
			payouts: 0
		});
		this.nameInput.update(this.data);
		this.beginningDrawer.update(this.data.drawer);
		this.sales.innerHTML = SV.formatCurrency(this.data.totals.total);
		this.credit.update(this.data.drawer);
		this.creditTips.update(this.data.drawer);
		this.giftCards.update(this.data.drawer);
		this.payouts.update(this.data.drawer);
		this.endingDrawer.update(this.data.drawer);
		this.updateCalculations();
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

		var controls = SV.el('div', { parent: this.node, style: { marginTop: '2em' }});

		this.hidePaid = true;
		this.hidePaidButton = SV.el('div', { parent: controls, className: 'btn',
			events: { click: () => { this.hidePaid = !this.hidePaid; this.render(); }}});

		this.ticketGroupsContainer = this.appendView(new ViewsContainer(TicketGroup));
		this.ticketGroupsContainer.on('viewAdded', (view) => {
			view.on('editTicketDetails', (ticket) => {
				this.ticketEditDetailsModal.update(ticket);
				this.ticketEditDetailsModal.show();
			});
			view.on('totalsChanged', (ticket) => {
				this.emit('totalsChanged', ticket);
			});
			view.on('ticketListItemViewAdded', (view) => {
				if(view.data.key === this.newTicketKey) {
					// We just added this ticket, so display it in edit mode and store so we can scroll to it:
					this.newTicketView = view;
					this.newTicketView.toggleEditMode(); 
					this.newTicketView.node.scrollIntoView();	
				}
			});
		});

		//this.ticketsContainer = this.appendView(new ViewsContainer(TicketListItem));
		//this.ticketsContainer.on('viewAdded', (view) => {
		//	view.on('editTicketDetails', (ticket) => {
		//		this.ticketEditDetailsModal.update(ticket);
		//		this.ticketEditDetailsModal.show();
		//	});
		//	view.on('totalsChanged', (ticket) => {
		//		this.emit('totalsChanged', ticket);
		//	});
		//	if(view.data.key === this.newTicketKey) {
		//		// We just added this ticket, so display it in edit mode and store so we can scroll to it:
		//		this.newTicketView = view;
		//		this.newTicketView.toggleEditMode(); 
		//		this.newTicketView.node.scrollIntoView();	
		//	}
		//});
		//this.ticketsContainer.node.style.marginTop = '2em';
		
		this.ticketEditDetailsModal = this.appendView(new TicketEditDetailsModal());
		this.ticketEditDetailsModal.on('deleted', (ticket) => {
			this.emit('totalsChanged');
		});
		this.ticketEditDetailsModal.on('selectTable', (ticket) => {
			this.selectTable(ticket);
		});



		this.selectTableModal = new SelectTableModal();
		this.node.appendChild(this.selectTableModal.node);
	}
	add() {
		var newItem = {
			key: SyncNode.guidShort(),
			addedAt: new Date().toISOString(),
			addedBy: window.recSettings.currentUser,
			servedBy: window.recSettings.currentUser,
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
	sortTicketGroups(groups) {
		// sort tickets with currentUser first:
		var groups = SV.group(SV.toArray(this.data), 'servedBy');
		var currUser = window.recSettings.currentUser;

		var sorted = {};
		if(groups[currUser]) {
			sorted[currUser] = groups[currUser];
		}

		Object.keys(groups).forEach((key) => {
			if(key !== currUser) {
				sorted[key] = groups[key];
			}
		});

		return sorted;
	}
	render() {
		this.ticketGroupsContainer.update(this.sortTicketGroups());

		//this.ticketsContainer.update(this.data);
		if(this.ticketEditDetailsModal.data) {
			var ticket = this.data[this.ticketEditDetailsModal.data.key];
			if(ticket) this.ticketEditDetailsModal.update(ticket);
		}
		
		this.hidePaidButton.innerHTML = 'Paid Tickets: ' + (this.hidePaid ? 'Hidden' :  'Shown');

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

		SV.toArray(this.ticketGroupsContainer.views).forEach((groupView) => {
			SV.toArray(groupView.ticketsContainer.views).forEach((view) => {
				if(this.hidePaid && view.data.paymentStatus !== 'Unpaid' && !view.editMode) {
					view.node.style.display = 'none';
				} else {
					view.node.style.display = filtered[view.data.key] ? 'block' : 'none';
				}
			});
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
				events: { click: () => { 
					this.data.set('table', table); this.hide(); }}});
		});

		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', className: 'btn cancel',
		       style: { marginTop: '1em' },	
			events: { click: () => { this.hide(); }}});
	}
	render() {
		this.ticketName.innerHTML = this.data.name;	
	}
}

class TicketGroup extends SyncView {
	constructor() {
		super();
		this.servedBy = SV.el('h3', { parent: this.node,
				style: { marginTop: '2em' }});

		this.ticketsContainer = this.appendView(new ViewsContainer(TicketListItem, 'table'));
		this.ticketsContainer.on('viewAdded', (view) => {
			view.on('editTicketDetails', (ticket) => {
				this.emit('editTicketDetails', ticket);
			});
			view.on('totalsChanged', (ticket) => {
				this.emit('totalsChanged', ticket);
			});
			this.emit('ticketListItemViewAdded', view);
		});
		
	}
	render() {
		this.servedBy.innerHTML = this.data.key;
		this.ticketsContainer.update(this.data);
	}
}


class TicketListItem extends SyncView {
	constructor() {
		super();
		this.node.className = 'ticket-list-item';
		this.node.style.padding = '0';
		this.node.style.color = '#000';

		this.mainView = SV.el('div', { parent: this.node, 
			style: { padding: '1.5em', color: '#FFF', position: 'relative' },
			events: { click: () => { this.toggleEditMode(); }}});
		
		//this.servedBy = SV.el('span', { 
		//	parent: this.mainView,
		//	style: { position: 'absolute', top: '0', left: '0', fontStyle: 'italic' }});

		this.amount = SV.el('span', { parent: this.mainView,
			style: { float: 'right' }});

		this.tableSpan = SV.el('span', { parent: this.mainView,
	       		style: { display: 'inline-block', width: '4em' }});
		this.nameSpan = SV.el('span', { parent: this.mainView,
	       		style: { display: 'inline-block', fontSize: '1.3em', fontWeight: 'bold' }});
		this.total = SV.el('span', {
			parent: this.mainView,
	       		style: { float: 'right' }});
		this.lastOrderTime = SV.el('span', {
			parent: this.mainView,
	       		style: { fontStyle: 'italic', marginRight: '2em', float: 'right' }});

		this.editMode = false;
		this.editView = this.appendView(new TicketEdit());
		this.editView.on('selectTable', (ticket) => { this.emit('selectTable', ticket); });
		this.editView.on('editTicketDetails', (ticket) => { this.emit('editTicketDetails', ticket); });
		this.editView.on('totalsChanged', (ticket) => { 
			this.emit('totalsChanged', ticket); 
			this.updateLastOrderTime(); 
		});
	}
	toggleEditMode() {
		this.editMode = !this.editMode; 
		this.render();
		if(this.editMode) this.node.scrollIntoView();
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
			this.mainView.style.backgroundColor = '#009688';
		} else {			
			this.node.style.backgroundColor = '#BBB';
			this.mainView.style.backgroundColor = '#BBB';
		}


		//this.servedBy.innerHTML = SV.substr(ticket.servedBy, ' ');
		this.tableSpan.innerHTML = ticket.table;
		this.nameSpan.innerHTML = ticket.name;
		this.total.innerHTML = SV.formatCurrency(ticket.totals.total);
		this.editView.update(this.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';

		if(!this.lastOrderTimeTimer) {
			this.updateLastOrderTime();
			this.lastOrderTimeTimer = setInterval(() => { this.updateLastOrderTime(); }, 30000);
		}
	}
}






class TicketEdit extends SyncView {
	constructor() {
		super();

		this.node.style.padding = '1em';
		this.node.classList.add('group');



		var controls = SV.el('div', { parent: this.node,
	       		style: { marginBottom: '2em', overflow: 'hidden', float: 'right' }});	
	
		this.addButton = SV.iconButton('add', { parent: controls, 
			style: { float: 'right' },
			events: { click: () =>{ 
				window.reconciliationsView.selectMenuItemModal.select((menuItem) => {
					this.addOrderItem(menuItem);
				});
				//window.reconciliationsView.selectMenuItemGridModal.select((menuItem) => {
				//	this.addOrderItem(menuItem);
				//});
			}}});

			
		this.moreButton = SV.iconButton('more_vert', { parent: controls, 
			style: { float: 'right' },
			events: { click: () =>{ 
				this.emit('editTicketDetails', this.data);
			}}});
			
		this.togoButton = SV.el('button', { parent: controls, className: 'btn btn-big',
			style: { float: 'right', color: '#FFF' },
			events: { click: () =>{ 
				this.data.set('isTogo', !this.data.isTogo);
			}}});

		
		
		this.orderItemGroups = this.appendView(new ViewsContainer(OrderItemGroup));
		this.orderItemGroups.on('viewAdded', (view) => {
			view.on('orderItemSelected', (orderItem) => {
				this.orderItemEditModal.update(orderItem);
				this.orderItemEditModal.show();
				this.orderItemEditModal.note.focus();
			});
			view.on('addAgain', (orderItem) => {
				this.addOrderItem(orderItem, orderItem.quantity);
			});
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



		var btmControls = SV.el('div', { parent: this.node, style: { float: 'left', marginTop: '1em', width: '50%' }});

		this.paymentButton = SV.el('button', { parent: btmControls, className: 'btn', 
			style: { width: '100%' },
	       		events: { click: () => { this.cyclePaymentStatus(); }}});

		this.sendKitchenButton = SV.el('button', { parent: btmControls, className: 'btn', innerHTML: 'Send Kitchen', 
			style: { width: '100%' },
	       		events: { click: () => { this.sendKitchen(); }}});
		
		this.printReceiptButton = SV.el('button', { parent: btmControls, className: 'btn', innerHTML: 'Print Receipt', 
			style: { width: '100%' },
	       		events: { click: () => { this.printReceipt(); }}});



		var totals = SV.el('div', { parent: this.node,
	       		style: { marginTop: '2em', marginRight: '0.6em', float: 'right', overflow: 'hidden' }});	
		
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


	}
	sendKitchen() {
		var now = new Date().toISOString();
		var order = {
			key: now, //SyncNode.guidShort(),
			submittedAt: now,
			submittedBy: window.recSettings.currentUser,
			servedBy: this.data.servedBy,
			location: this.data.table,
			name: this.data.name,
			isTogo: this.data.isTogo,
			items: []	
		};

		var merge = { orderItems: {}};

		SV.toArray(this.data.orderItems).forEach((orderItem) => {
			if(!orderItem.submittedToKitchenAt) {
				merge.orderItems[orderItem.key] = { submittedToKitchenAt: now };
				order.items.push({
					key: SyncNode.guidShort(),
					description: orderItem.name,
					note: orderItem.note,
					quantity: orderItem.quantity,
					type: 'Food'
				});
			}
		});

		io().emit('send kitchen order', order);

		/*
		var req = new XMLHttpRequest();
		req.onreadystatechange = function() {
			if (req.readyState == 4 && req.status == 200) {
				console.log('success!');
				//this.data.merge(merge);
			} else {
				console.log('something else happened: ', req.readyState, req.status);
			}
		};
		req.open('POST', 'http://192.168.6.5:1337/api/kitchen/orders', true);
		req.setRequestHeader("Content-type", "application/json");	
		req.send(JSON.stringify(order));
		*/
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
		this.data.merge({ totals: totals });
		this.emit('totalsChanged', this.data);
	}
	addOrderItem(menuItem, quantity) {
		quantity = quantity || 1;
		var orderItem = {
			key: SyncNode.guidShort(),
			addedAt: new Date().toISOString(),
			addedBy: window.recSettings.currentUser,
			servedBy: window.recSettings.currentUser,
			name: menuItem.name,
			price: menuItem.price,
			quantity: quantity,
			taxType: menuItem.taxType,
			note: menuItem.note || '' 
		};
		this.data.orderItems.set(orderItem.key, orderItem);
		this.updateTotals();
		//toastr.success('to ' + this.data.name, 'Added ' + orderItem.name);
		alertify.closeLogOnClick(true).maxLogItems(100);
		alertify.success('Added <b>' + orderItem.name + '</b> to ' + this.data.name + '.');
	}
	cyclePaymentStatus() {
		var status = this.data.paymentStatus;
		var newStatus;
		if(status === 'Unpaid') newStatus = 'Credit Card';
		else if(status === 'Credit Card') newStatus = 'Cash';
		else newStatus = 'Unpaid';
		console.log('set payment status');
		this.data.set('paymentStatus', newStatus);
	}
	render() {
		this.data.on('orderItemsChanged', this.updateTotals.bind(this));

		var isPaid = this.data.paymentStatus !== 'Unpaid';
		
		if(isPaid) {
			this.node.style.backgroundColor = '#DDD';
		} else {			
			this.node.style.backgroundColor = '#FFF';
		}


		this.addButton.disabled = isPaid;
		this.moreButton.disabled = isPaid;
		this.togoButton.innerHTML = this.data.isTogo ? 'Togo: YES' : 'Togo: No';
		this.togoButton.style.backgroundColor = this.data.isTogo ? '#EF5350' : '#717171';


		this.food.innerHTML = SV.formatCurrency(this.data.totals.food);
		this.tax.innerHTML = SV.formatCurrency(this.data.totals.tax);
		this.alcohol.innerHTML = SV.formatCurrency(this.data.totals.alcohol);
		this.total.innerHTML = SV.formatCurrency(this.data.totals.total);
		this.paymentButton.innerHTML = this.data.paymentStatus;

		var groups = SV.group(this.data.orderItems, (item) => { return item.name + ' ' + item.note; });  
		this.orderItemGroups.update(groups);

	}
}

class TicketEditDetailsModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Ticket Details' });

		var controls = SV.el('div', { parent: this.mainView, className: 'group' });

		SV.iconButton('delete', { parent: controls,
			events: { click: () =>{ 
				Modal.confirm('Delete ticket?', `Delete ${this.data.name}?`,
			       		() => { 
						this.data.parent.remove(this.data.key); 
						this.emit('deleted', this.data);
						this.hide();
					});
			}}});

		SV.iconButton('done', { parent: controls, className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});



		var footer = SV.el('div', { parent: this.mainView, className: 'group footer' });

		this.selectTable = SV.el('button', { parent: footer, innerHTML: 'Table', className: 'btn btn-big',
			style: { float: 'left', marginBottom: '1em' },
			events: { click: () => { this.emit('selectTable', this.data); }}});
		
		footer = SV.el('div', { parent: this.mainView, className: 'group footer' });
		this.nameInput = new SimpleEditInput('name', 'Customer');
		footer.appendChild(this.nameInput.node);
		
		//this.servedBySelect = SV.el('select', { parent: footer, id: 'teasdasdf',
	//		style: { float: 'right' }});
		//this.usersContainer = new ViewsContainer(UserListItem, null, null, this.servedBySelect);
		//this.usersContainer.debug = true;
		
		footer = SV.el('div', { parent: this.mainView, className: 'group footer' });

		this.servedBySelect = new SimpleEditSelect('servedBy', 'Server');
		footer.appendChild(this.servedBySelect.node);

		window.membersSync.on('updated', (data) => {
			var users = SV.filterMap(data, (member) => { return member.data.info.isStaff });
			var options = SV.toArray(users).map((user) => { return user.data.info.name; });
			this.servedBySelect.updateOptions(options);
		});	
	}
	render() {
		this.selectTable.innerHTML = this.data.table;
		this.nameInput.update(this.data);
		
		this.servedBySelect.update(this.data);
	}
}

class OrderItemGroup extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'order-item',
	       		style: { borderBottom: '1px solid #DDD', marginBottom: '1em', paddingBottom: '0.5em' }})); 

		this.showDetails = false;

		var header = SV.el('div', { parent: this.node,
			events: { click: () => { this.showDetails = !this.showDetails; this.render(); }}});

		this.moreButton = SV.el('div', { parent: header, className: 'btn',
			style: { float: 'right', height: '100%' }})

		this.nameSpan = SV.el('span', { parent: header,
	       		style: { float: 'left', display: 'inline-block', width: '8em', fontWeight: 'bold' }});
		this.time = SV.el('span', { parent: header,
			style: { display: 'inline-block', fontStyle: 'italic', 
		       		color: '#999'}});
		this.price = SV.el('span', { parent: header,
	       		style: { float: 'right', marginRight: '2.8em', fontWeight: 'bold' }});
		
		this.note = SV.el('span', { parent: header,
			style: { display: 'block', float: 'left', marginLeft: '5em', marginTop: '0', fontStyle: 'italic' }});



		this.itemsView = SV.el('div', { parent: this.node });
	
		this.orderItems = this.appendView(new ViewsContainer(OrderItem), this.itemsView);
		this.orderItems.on('viewAdded', (view) => {
			view.on('selected', (orderItem) => {
				this.emit('orderItemSelected', orderItem);
			});
			view.on('addAgain', (orderItem) => {
				this.emit('addAgain', orderItem);
			});
		});


	}
	updateTime() {
		this.time.innerHTML = moment(this.data.addedAt).from(moment());
	}
	render() {
		var items = SV.toArray(this.data);
		var model = items[0];
		
		this.nameSpan.innerHTML = model.name;
		var price = SV.formatCurrency(model.price);
		var totalQuantity = 0;
		var totalAmount = 0;
		items.forEach((item) => { 
			var quantity = parseFloat(item.quantity);
			var price = parseFloat(item.price);
			totalQuantity += quantity;
			totalAmount += (quantity * price); 
		});
		var averagePrice = totalAmount / totalQuantity;
		this.price.innerHTML = (totalQuantity != 1 ? totalQuantity + ' x ' : '') + SV.formatCurrency(averagePrice);
		//if(!this.timeTimer) {
		//	this.updateTime();
		//	this.timeTimer = setInterval(() => { this.updateTime(); }, 30000);
		//}
		this.note.innerHTML = model.note;

		var icon = this.showDetails ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
		this.moreButton.innerHTML = `<i class="material-icons">${icon}</i>`; 

		this.orderItems.node.style.display = this.showDetails ? 'block' : 'none';
		this.orderItems.update(this.data);
	}
}


class OrderItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'order-item', style: { color: '#888' }})); 

		//this.nameSpan = SV.el('span', { parent: this.node,
	       	//	style: { float: 'left', display: 'inline-block', width: '8em', clear: 'both' }});
		this.time = SV.el('span', { parent: this.node, className: 'time',
			style: { display: 'inline-block', fontStyle: 'italic', 
		       		color: '#999' }});
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
		
		//this.note = SV.el('span', { parent: this.node,
		//	style: { display: 'block', float: 'left', marginLeft: '5em', marginTop: '0', fontStyle: 'italic' }});
	}
	updateTime() {
		this.time.innerHTML = moment(this.data.addedAt).from(moment());
	}
	render() {
		//this.nameSpan.innerHTML = this.data.name;
		var price = SV.formatCurrency(this.data.price);
		this.price.innerHTML = (this.data.quantity != 1 ? this.data.quantity + ' x ' : '') + price;
		if(!this.timeTimer) {
			this.updateTime();
			this.timeTimer = setInterval(() => { this.updateTime(); }, 30000);
		}
		//this.note.innerHTML = this.data.note;
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
			style: { float: 'left' },
			events: { click: () => { 
					Modal.confirm('Delete Order Item?', this.data.name, () => {
						this.data.parent.remove(this.data.key); this.hide(); 
						this.emit('deleted', this.data);
					});
				}
			}});
		SV.iconButton('swap_horiz', { parent: footer, className: 'btn btn-big',
			style: { float: 'left' },
			events: { click: () => { this.moveOrderItem(); }}});

		this.addedBy = SV.el('p', { parent: this.mainView });

		this.views = [];
		this.views.push(this.appendView(new SimpleEditInput('name', 'Name'), this.mainView));
		this.price = this.appendView(new SimpleEditInput('price', 'Price'), this.mainView);
		this.price.on('changed', () => { this.emit('totalChanged', this.data); });
		this.views.push(this.price);

		this.quantity = this.appendView(new SimpleEditInput('quantity', 'Quantity'), this.mainView);
		this.quantity.on('changed', () => { this.emit('totalChanged', this.data); });
		this.views.push(this.quantity);
	
		this.note = this.appendView(new SimpleEditInput('note', 'Note', { isTextArea: true }), this.mainView);
		this.note.input.rows = 10;
		this.views.push(this.note);
	}
	moveOrderItem() {
		window.reconciliationsView.recDetailsView.selectTicketModal.select((ticket) => {
			var currTicket = this.data.parent.parent;
			//currTicket.orderItems.remove(this.data.key);
			//currTicket.emit('orderItemsChanged');
			//ticket.orderItems.set(this.data.key, this.data);
			//ticket.emit('orderItemsChanged');
			var merge = {};
			merge[currTicket.key] = { orderItems: { __remove: this.data.key }};

			var orderItems = {};
			orderItems[this.data.key] = this.data;
			merge[ticket.key] = { orderItems: orderItems };
			currTicket.parent.merge(merge);
			
			currTicket.emit('orderItemsChanged');
			ticket.emit('orderItemsChanged');

			alertify.success('Moved <b>' + this.data.name + '</b> from <b>' + currTicket.name + '</b> to <b>' + ticket.name + '</b>');
			this.hide();
		});
	}
	render() {
		var addedAt = moment(this.data.addedAt);
		this.addedBy.innerHTML = addedAt.from(moment()) + ' by ' + this.data.addedBy + ' at ' + addedAt.format('h:mm:ss a');
		SyncView.updateViews(this.views, this.data);
	}
}


class SelectTicketModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Ticket' });
	
		this.itemsContainer = new ViewsContainer(TicketSimpleView);
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
	select(callback, includePaid) {
		this.includePaid = includePaid;
		this.selectCallBack = callback;
		this.show();
	}
	hide() {
		this.selectCallBack = null;
		super.hide();
	}
	render() {
		var filtered = this.includePaid ? this.data : SV.filterMap(this.data, (t) => { return t.paymentStatus === 'Unpaid'; }); 
		this.itemsContainer.update(filtered);
	}
}

class TicketSimpleView extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'btn btn-wide', 
			events: { click: () => { this.emit('selected', this.data); }}}));
		this.nameSpan = SV.el('span', { parent: this.node });
		this.total = SV.el('span', { parent: this.node, 
			style: { float: 'right' }});
	}
	render() {
		this.nameSpan.innerHTML = this.data.table + ' ' + this.data.name;
		this.total.innerHTML = SV.formatCurrency(this.data.totals.total);
	}
}




class SelectMenuItemGridModal extends Modal {
	constructor() {
		super();

		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', className: 'btn btn-big cancel',
		       style: { marginTop: '1em', float: 'right' },	
			events: { click: () => { this.hide(); }}});

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Menu Item' });

		this.itemsContainer = this.appendView(new ViewsContainer(MenuItemGrid), this.mainView);

		SV.el('button', { parent: this.mainView, innerHTML: 'Add Grid', className: 'btn btn-big',
		       style: { marginTop: '1em', float: 'right' },	
			events: { click: () => { 
				this.newMenuItemGridModal.go(this.addGrid.bind(this));
			}}});
		this.newMenuItemGridModal = this.appendView(new NewMenuItemGridModal(), this.mainView);
	}
	addGrid(grid) {
		console.log('this.data at addGrid', this.data);
		this.data.grids.set(grid.key, grid);
	}
	select(callback) {
		this.selectCallback = callback;
		this.show();
	}
	hide() {
		this.selectCallback = null;
		super.hide();
	}
	render() {
		console.log('this.data', this.data);
		this.itemsContainer.update(this.data.grids);
	}
}


class NewMenuItemGridModal extends Modal {
	constructor() {
		super();

		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', className: 'btn btn-big cancel',
		       style: { marginTop: '1em', float: 'right' },	
			events: { click: () => { this.hide(); }}});

		SV.el('h1', { parent: this.mainView, innerHTML: 'New Menu Item Grid' });
		this.nameInput = SV.el('input', { parent: this.mainView });

		SV.el('button', { parent: this.mainView, innerHTML: 'Ok', className: 'btn btn-big',
		       style: { marginTop: '1em', float: 'right' },	
			events: { click: () => { 
				if(this.finishedCallback) {
					this.finishedCallback({
						key: SyncNode.guidShort(),
						name: this.nameInput.value
					}) 
				}
				this.hide(); 
			}}});
	}
	go(callback) {
		this.finishedCallback = callback;
		this.show();
	}
	hide() {
		this.finishedCallback = null;
		super.hide();
	}
	render() {
	}
}


class MenuItemGrid extends SyncView {
	constructor() {
		super();

		this.nameSpan = SV.el('span', { parent: this.node });

		this.itemsContainer = this.appendView(new ViewsContainer(MenuItemGridCell), this.mainView);
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;
		this.itemsContainer.update(this.data.items);
	}
}


class MenuItemGridCell extends SyncView {
	constructor() {
		super(SV.el('div', { 
			style: {
				width: '100px',
				height: '100px',
				display: 'inline-block',
				float: 'left'
			},
			events: { click: () => { this.emit('selected', this.data); }}}));
		
		var nameSpan = SV.el('span', { parent: this.node });
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;
	}
}





class SelectMenuItemModal extends Modal {
	constructor() {
		super();

		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', className: 'btn btn-big cancel',
		       style: { marginTop: '1em', float: 'right' },	
			events: { click: () => { this.hide(); }}});

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Menu Item' });
	
		var container = SV.el('div', { parent: this.mainView, className: 'group' });

		var categories = SV.el('div', { parent: container, 
			style: { width: '49%', display: 'inline-block', float: 'left' }});

		this.categoriesContainer = this.appendView(new ViewsContainer(MenuCategory, 'name'), categories);
		this.categoriesContainer.node.style.marginTop = '2em';
		this.categoriesContainer.on('viewAdded', (view) => {
			view.on('selected', (category) => {
				this.selectedCategory = category;
				this.render();
			});
		});


		var items = SV.el('div', { parent: container, 
			style: { width: '49%', display: 'inline-block', float: 'left' }});


		this.itemsContainer = this.appendView(new ViewsContainer(MenuItem, 'name'), items);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (menuItem) => { 
				if(this.selectCallback) this.selectCallback(menuItem);
				this.hide(); 
			});
		});

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });

		SV.el('button', { parent: footer, innerHTML: 'Cancel', className: 'btn btn-big cancel',
		       style: { marginTop: '1em', float: 'right' },	
			events: { click: () => { this.hide(); }}});
	}
	select(callback) {
		this.selectCallback = callback;
		this.show();
	}
	hide() {
		this.selectCallback = null;
		super.hide();
	}
	render() {
		this.categoriesContainer.update(SV.filterMap(this.data.categories, (cat) => { return !cat.isDisabled; }));
		var filtered = {};
		if(this.selectedCategory) {
			filtered = SV.filterMap(this.data.items, (item) => { return !item.isDisabled && item.category === this.selectedCategory.name });
		}
		this.itemsContainer.update(filtered);
	}
}

class MenuCategory extends SyncView {
	constructor() {
		super();

		var btn = SV.el('div', { parent: this.node, className: 'btn btn-wide', 
	       		events: { click: () => { this.emit('selected', this.data); }}});

		this.nameSpan = SV.el('span', { parent: btn, 
			style: { }});
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;	
	}
}


class MenuItemGroup extends SyncView {
	constructor() {
		super();

		this.node.style.marginTop = '2em';
		this.nameSpan = SV.el('h3', { parent: this.node });
		
		this.itemsContainer = new ViewsContainer(MenuItem);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (menuItem) => {
				this.emit('menuItemSelected', menuItem);
			});
		});
		this.node.appendChild(this.itemsContainer.node);
	}
	render() {
		this.nameSpan.innerHTML = this.data.key;
		this.itemsContainer.update(this.data);
	}
}


class MenuItem extends SyncView {
	constructor() {
		super(SV.el('div', { className: 'btn btn-wide', 
			style: { backgroundColor: 'transparent' },
			events: { click: () => { this.emit('selected', this.data); }}}));

		this.serveTypeImg = SV.el('img', { parent: this.node, 
			style: { display: 'inline-block', width: '1em', marginRight: '0.5em' }});

		this.nameSpan = SV.el('span', { parent: this.node });
		this.price = SV.el('span', { parent: this.node, 
			style: { float: 'right' }});
	}
	render() {
		var src = '';
		switch(this.data.serveType) {
			case 'Kitchen':
				src = 'kitchen.png';
				break;
			case 'Bar':
				src = 'bar.png';
				break;
			default:
				src = '';
		}
		if(src !== '') {
			this.serveTypeImg.src = '/imgs/' + src;
		} else {
			this.serveTypeImg.src = '';
		}
		this.nameSpan.innerHTML = this.data.name;
		this.price.innerHTML = SV.formatCurrency(this.data.price);
		this.node.style.backgroundColor = this.data.isDisabled ? '#DDD' : '#81C784';
	}
}





SV.startReloader();

window.sync = new SyncNodeSocket('/data', {});
window.membersSync = new SyncNodeSocket('/members', {});
window.recSettings = new LocalSyncNode('recSettings');	

window.reconciliationsView = new Reconciliations();
SV.onLoad(() => { 
	SV.id('container').appendChild(window.reconciliationsView.node); 
});

