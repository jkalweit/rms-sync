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

class SelectTableModal extends Modal {
	constructor() {
		super();

		SV.el('h1', { parent: this.mainView, innerHTML: 'Select Table' });
		this.ticketName = SV.el('h2', { parent: this.mainView });
		SV.el('button', { parent: this.mainView, innerHTML: 'Cancel', 
			events: { click: () => { this.hide(); }}});

		var tables = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', 'Bar', 'Deck'];
		tables.forEach((table) => {
			SV.el('button', { parent: this.mainView, innerHTML: table,
				events: { click: () => { this.data.set('table', table); this.hide(); }}});
		});
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

		this.amount = SV.el('span', { 
			parent: this.node,
			style: { float: 'right' }});
		this.name = SV.el('span', {
			parent: this.node,
			events: { click: () => { this.editMode = !this.editMode; this.render(); }}});

		this.editMode = false;
		//this.editView = this.appendView(new MemberEdit());
	}
	render() {
		var ticket = this.data;
		this.name.innerHTML = ticket.table + ' ' + ticket.name;
		this.name.style.color = ticket.isPaid ? '#44F' : '#555';
		//this.editView.update(member.data);
		//this.editView.node.style.display = this.editMode ? 'block' : 'none';
	}
}

class MemberEdit extends SyncView {
	constructor() {
		super();

		SV.mergeMap({ borderBottom: '1px solid #aaa', padding: '1em' },
				this.node.style);

		this.views = [];

		this.views.push(this.appendView(new SimpleEditInput('name', 'Name')));
		this.views.push(this.appendView(new SimpleEditInput('phone', 'Phone')));
		this.views.push(this.appendView(new SimpleEditInput('email', 'Email')));		
		var view = this.appendView(new SimpleEditInput('emailVerificationId', 'Email Id'));
		view.input.readOnly = true;
		view.input.style.backgroundColor = '#DDD';
		this.views.push(view);
		this.views.push(this.appendView(new SimpleEditInput('note', 'Note')));

		var label = SV.el('label', { parent: this.node, innerHTML: 'Is Staff:', className: 'group' });
		this.isStaff = SV.el('input', { parent: label, type: 'checkbox',
	       		events: { click: () => { this.data.info.set('isStaff', !this.data.info.isStaff); }}});
		
		label = SV.el('label', { parent: this.node, innerHTML: 'Is Email Verified:', className: 'group' });
		this.isEmailVerified = SV.el('input', { parent: label, type: 'checkbox',
	       		events: { click: () => { this.data.info.set('isEmailVerified', !this.data.info.isEmailVerified); }}});

		SV.el('button', { parent: this.node, innerHTML: 'Send Verification Email',
			style: { marginTop: '.5em' },
			events: { click: () => { this.sendEmailVerification(); }}}); 


		SV.el('button', { parent: this.node, innerHTML: 'Delete',
			style: { marginTop: '.5em' },
			events: { click: () =>{ 
				if(confirm(`Delete ${this.data.info.name}?`)) this.data.parent.parent.remove(this.data.parent.key); }}});

			this.pointsView = this.appendView(new PointsView());
	}
	sendEmailVerification() {
		var verificationId = SyncNode.guidShort();
		this.data.info.set('emailVerificationId', verificationId);
		SV.sendEmailFromAdmin({
			address: this.data.info.email,
			subject: 'Welcome to The Coal Yard!',
			htmlBody: 
		`Hello ${this.data.info.name}, please verify your email address by clicking this link: <br/><br/>
		<a href="https://www.thecoalyard.com/verify?id=${verificationId}">Verify Email Address</a>`
		});
	}
	render() {
		SyncView.updateViews(this.views, this.data.info);
		this.isStaff.checked = this.data.info.isStaff;
		this.isEmailVerified.checked = this.data.info.isEmailVerified;
		if(!this.data.loyalty) this.data.set('loyalty', {});
		if(!this.data.loyalty.pointsHistory) this.data.loyalty.set('pointsHistory', {});
		this.pointsView.update(this.data.loyalty.pointsHistory);	
	}
}

SV.startReloader();

var t = new Reconciliation();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

