"use strict"



class Members extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/members', {});
		this.sync.onUpdated((data) => {
			this.update(data);
		});

		
		SV.el('h1', {
			parent: this.node,
			innerHTML: 'Members',
			className: 'light' });

		this.addMemberView = SV.el('form', {
			parent: this.node,
			events: {
				submit: (e) => {
					this.addMember();
					e.preventDefault();
				}
			}});
		this.addMemberInput = SV.el('input', {
			parent: this.addMemberView,
			style: {
				fontSize: '2em',
				width: 'calc(100% - 3em)'
			},
			events: {
				keyup: () => { this.render(); }
			}});
		SV.el('input', {
			parent: this.addMemberView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '2em',
			}});

		this.membersContainer = this.appendView(new ViewsContainer(Member));
	}
	addMember() {
		var created = new Date().toISOString();
		var newMember = {
			key: created,
			loginid: created,
			password: 'password',
			permissions: {},
			data:{
				info: {
					name: this.addMemberInput.value,
					memberSince: created,
					email: '',
					phone: '',
					note: '',
					points: 0
				},
				loyalty: {
					points: 0,
					pointsHistory: {}
				}
			}
		};
		this.data.set(newMember.key, newMember);
		this.addMemberInput.value = '';
		SV.sendToAdmin('Added Loyalty Member: ' + newMember.name);	
	}	
	render() {
		var filteredMembers;
		var filterText = this.addMemberInput.value.trim().toLowerCase();
		if(filterText) {
			filteredMembers = SV.filterMap(this.data,
					(m) => {
						return m.data.info.name.toLowerCase().indexOf(filterText) !== -1 ||
				SV.normalizePhone(m.data.info.phone).indexOf(SV.normalizePhone(filterText)) !== -1; });
		} else {
			filteredMembers = this.data;
		}

		this.membersContainer.update(filteredMembers);
	}
}


class Member extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';
		this.node.style.padding = '0.2em 1em';

		this.points = SV.el('span', { 
			parent: this.node,
			style: { float: 'right' }});
		this.memberName = SV.el('span', {
			parent: this.node,
			className: 'light',
			events: { click: () => { this.editMode = !this.editMode; this.render(); }}});

		this.editMode = false;
		this.editView = this.appendView(new MemberEdit());
	}
	render() {
		this.node.style.backgroundColor = this.editMode ? '#EEE' : '#FFF';

		var member = this.data;
		this.memberName.innerHTML = member.data.info.name;
		this.memberName.style.color = member.data.info.isStaff ? '#44F' : 'default';
		this.points.innerHTML = member.data.loyalty ? member.data.loyalty.points | 0 : 0;
		this.editView.update(member.data);
		this.editView.node.style.display = this.editMode ? 'block' : 'none';
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
		var verificationId = SV.guidShort();
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

class PointsView extends SyncView {
	constructor() {
		super();
		SV.mergeMap({ padding: '1em' }, this.node.style);

		var form = SV.el('form', { parent: this.node,
			events: { submit: (e) => { e.preventDefault(); this.addPoints(); }}});
		this.typeSelect = SV.el('select', { parent: form });
		SV.el('option', { parent: this.typeSelect, innerHTML: 'Dinner'});
		SV.el('option', { parent: this.typeSelect, innerHTML: 'Redeem'});
		this.amountInput = SV.el('input', { parent: form });
		SV.el('input', { parent: form, value: 'Add', type: 'submit' });

		this.pointsContainer = new ViewsContainer(Points, 'key', 'reverse');
		this.pointsContainer.node.style.marginTop = '1em';
		this.node.appendChild(this.pointsContainer.node);
	}
	addPoints() {
		var amount = parseFloat(this.amountInput.value);
		if(amount) {
			var points = {
				key: new Date().toISOString(),
				type: this.typeSelect.value,
				amount: amount
			};			
			var newTotal = this.getPointTotal() + PointsView.getPointAmount(points);
			var merge = { points: newTotal, pointsHistory: {}};
			merge.pointsHistory[points.key] = points;
			this.data.parent.merge(merge);
			this.amountInput.value = '';
		} else {
			alert('Invalid amount: ' + this.amountInput.value);
		}
	}
	static getPointAmount(points) {
		return points.amount * (points.type === 'Redeem' ? -1 : 1);
	}
	getPointTotal() {
		var sum = 0;
		var arr = SV.toArray(this.data);
		arr.forEach((points) => { 
			sum += PointsView.getPointAmount(points); 
		});
		return sum;
	}
	render() {
		this.pointsContainer.update(this.data);
		//		SV.updateViews(this.pointsContainer, this.pointsViews, LoyaltyPoints, this.data, SV.toArray(this.data, 'key', true));
	}
}


class Points extends SyncView {
	constructor() {
		super();
		this.dateSpan = SV.el('span', { parent: this.node,
			style: { display: 'inline-block', width: '50%' }});
		this.typeSpan = SV.el('span', { parent: this.node,
			style: { display: 'inline-block', width: '25%' }});
		this.amountSpan = SV.el('span', { parent: this.node,
			style: { display: 'inline-block', width: '25%', textAlign: 'right' }});

		this.editView = new PointsEdit();
		this.editView.on('pointsChanged', () => { this.emit('pointsChanged'); });
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
		this.amountSpan.style.color = this.data.type === 'Redeem' ? '#44DD44' : 'initial';

		this.editView.node.style.display = this.adminMode ? 'initial' : 'none';
		this.editView.update(this.data);
	}
}

class PointsEdit extends SyncView {
	constructor() {
		super();

		SV.mergeMap({ borderBottom: '1px solid #aaa', padding: '1em' },
				this.node.style);

		this.views = [];

		var typeInput = this.appendView(new SimpleEditInput('type', 'Type'));
		typeInput.on('changed', () => { this.emit('pointsChanged'); });

		this.views.push(typeInput);
		var amountInput = this.appendView(new SimpleEditInput('amount', 'Amount', 
					(val) => { return !isNaN(parseFloat(val)); },
					(val) => { return parseFloat(val); }));
		amountInput.on('changed', () => { console.log('changed!'); this.emit('pointsChanged'); });
		this.views.push(amountInput);
		this.views.push(this.appendView(new SimpleEditInput('note', 'Note')));

		SV.el('button', { parent: this.node, innerHTML: 'Delete',
			style: { marginTop: '.5em' },
			events: { click: this.remove.bind(this) }})
	}
	remove() {
		if(confirm(`Delete ${this.data.amount}?`)) {
			this.data.parent.remove(this.data.key); 
			this.emit('pointsChanged');
		}
	}
	render() {
		SyncView.updateViews(this.views, this.data);
	}
}




SV.startReloader();

var t = new Members();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

