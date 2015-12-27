"use strict"








class LoyaltyMembers extends SyncView {
	constructor() {
		super();

		el('h1', {
			parent: this.node,
			innerHTML: 'Loyalty Members',
			className: 'light' });

		this.addMemberView = el('form', {
			parent: this.node,
		        events: {
				submit: (e) => {
					this.addMember();
					e.preventDefault();
				}
			}});
		this.addMemberInput = el('input', {
			parent: this.addMemberView,
			style: {
				fontSize: '2em',
				width: 'calc(100% - 3em)'
			},
			events: {
				keyup: () => { this.render(); }
			}});
		el('input', {
			parent: this.addMemberView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '2em',
			}});

		this.membersContainer = el('div', {
			parent: this.node });
		this.memberViews = {};
	}
	addMember() {
		var created = new Date().toISOString();
		var newMember = {
			key: created,
			name: this.addMemberInput.value,
			memberSince: created,
			email: '',
			phone: '',
			note: '',
			points: 0,
			pointHistory: {}
		};
		this.data.members.set(newMember.key, newMember);
		this.addMemberInput.value = '';
	}
	static normalizePhone(phone) {
		return phone.replace('-', '').replace('(', '').replace(')', '').replace('.', '').replace(' ', '').toLowerCase();
	}
	render() {
		var filteredMembers;
		var filterText = this.addMemberInput.value.trim().toLowerCase();
		if(filterText) {
			filteredMembers = SV.filterMap(this.data.members,
				(m) => {
					return m.name.toLowerCase().indexOf(filterText) !== -1 ||
								LoyaltyMembers.normalizePhone(m.phone).indexOf(LoyaltyMembers.normalizePhone(filterText)) !== -1; });
		} else {
			filteredMembers = this.data.members;
		}

		SV.updateViews(this.membersContainer, this.memberViews, LoyaltyMember, filteredMembers);
	}
}


class LoyaltyMember extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';

		this.points = el('span', { 
			parent: this.node,
			style: { float: 'right' }});
		this.memberName = el('span', {
			parent: this.node,
			className: 'light',
		 	events: { click: () => { SV.flash(this.memberName); this.editMode = !this.editMode; this.render(); }}});

		this.editMode = false;
		this.editView = this.appendView(new LoyaltyMemberEdit());
	}
	render() {
		this.memberName.innerHTML = this.data.name;
		this.points.innerHTML = this.data.points;
		this.editView.update(this.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';
	}
}

class LoyaltyMemberEdit extends SyncView {
	constructor() {
		super();

		SV.mergeMap({ borderBottom: '1px solid #aaa', padding: '1em' },
			this.node.style);

		this.views = [];

		this.views.push(this.appendView(new SimpleEditInput('name', 'Name')));
		this.views.push(this.appendView(new SimpleEditInput('phone', 'Phone')));
		this.views.push(this.appendView(new SimpleEditInput('email', 'Email')));
		this.views.push(this.appendView(new SimpleEditInput('note', 'Note')));

		el('button', { parent: this.node, innerHTML: 'Delete',
			style: { marginTop: '.5em' },
			events: { click: () =>{ if(confirm(`Delete ${this.data.name}?`)) this.data.parent.remove(this.data.key); }}})

		this.pointsView = this.appendView(new LoyaltyPointsView());
	}
	render() {
		SyncView.updateViews(this.views, this.data);
		this.pointsView.update(this.data.pointHistory);
	}
}

class LoyaltyPointsView extends SyncView {
	constructor() {
		super();
		SV.mergeMap({ padding: '1em' }, this.node.style);

		var form = el('form', { parent: this.node,
		 		events: { submit: (e) => { e.preventDefault(); this.addPoints(); }}});
		this.typeSelect = el('select', { parent: form });
		el('option', { parent: this.typeSelect, innerHTML: 'Dinner'});
		this.amountInput = el('input', { parent: form });
		el('input', { parent: form, value: 'Add', type: 'submit' });

		this.pointsContainer = el('div', { parent: this.node,
	       		style: { marginTop: '1em' }});
		this.pointsViews = {};
	}
	addPoints() {
		var amount = parseFloat(this.amountInput.value);
		if(amount) {
			var points = {
				key: new Date().toISOString(),
				type: this.typeSelect.value,
				amount: amount
			};
			this.data.set(points.key, points);
			var sum = 0;
			SV.toArray(this.data).forEach((points) => { sum += points.amount; });
			this.data.parent.set('points', sum);
		} else {
			alert('Invalid amount: ' + this.amountInput.value);
		}
	}
	render() {
		SV.updateViews(this.pointsContainer, this.pointsViews, LoyaltyPoints, this.data, SV.toArray(this.data, 'key', true));
	}
}

class LoyaltyPoints extends SyncView {
	constructor() {
		super();
		this.dateSpan = el('span', { parent: this.node,
		 	style: { display: 'inline-block', width: '50%' }});
		this.typeSpan = el('span', { parent: this.node,
		 	style: { display: 'inline-block', width: '25%' }});
		this.amountSpan = el('span', { parent: this.node,
		 	style: { display: 'inline-block', width: '25%', textAlign: 'right' }});

		this.editView = new LoyaltyPointsEdit();
		this.node.appendChild(this.editView.node);		

		document.addEventListener('keypress', e => {
			if(e.keyCode === 94) { // 94 = '^'
				this.adminMode = !this.adminMode;
				this.render();
			}
		});
	}
	render() {
		this.dateSpan.innerHTML = moment(this.data.key).format('MM/DD/YYYY hh:mma');
		this.typeSpan.innerHTML = this.data.type;
		this.amountSpan.innerHTML = this.data.amount;

		this.editView.node.style.display = this.adminMode ? 'initial' : 'none';
		this.editView.update(this.data);
	}
}

class LoyaltyPointsEdit extends SyncView {
	constructor() {
		super();

		SV.mergeMap({ borderBottom: '1px solid #aaa', padding: '1em' },
			this.node.style);

		this.views = [];

		this.views.push(this.appendView(new SimpleEditInput('type', 'Type')));
		var amountInput = this.appendView(new SimpleEditInput('amount', 'Amount', 
						(val) => { return !isNaN(parseFloat(val)); },
						(val) => { return parseFloat(val); }));
		amountInput.on('changed', this.updatePoints.bind(this));
		this.views.push(amountInput);
		this.views.push(this.appendView(new SimpleEditInput('note', 'Note')));

		el('button', { parent: this.node, innerHTML: 'Delete',
			style: { marginTop: '.5em' },
			events: { click: () =>{ if(confirm(`Delete ${this.data.amount}?`)) this.data.parent.remove(this.data.key); }}})
	}
	updatePoints() {
	}
	render() {
		SyncView.updateViews(this.views, this.data);
	}
}






SV.startReloader();

var el = SV.el;

var t = new LoyaltyMembers();
SV.id('container').appendChild(t.node);

var sv = new SV();
sv.onupdated = () => {
	if(!sv.db.loyalty){
		sv.db.set('loyalty', { members: {} });
	} else {
		t.update(sv.db.loyalty);
	}
};

sv.startSync();
