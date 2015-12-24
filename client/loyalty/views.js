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
	render() {
		console.log('data', this.data);
		SV.updateViews(this.membersContainer, this.memberViews, LoyaltyMember, this.data.members);
	}
}


class LoyaltyMember extends SyncView {
	constructor() {
		super();

		this.memberName = el('h4', { 
			parent: this.node,
			className: 'light' });			
	}		
	render() {
		this.memberName.innerHTML = this.data.name;
	}
}

class LoyaltyMemberEdit extends SyncView {
	constructor() {
		super();

		this.memberName = el('input', { 
			parent: this.node });			
	}		
	render() {
		this.memberName.innerHTML = this.data.name;
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
