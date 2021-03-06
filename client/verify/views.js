"use strict"



class Verify extends SyncView {
	constructor() {
		super();
		
		this.sync = new SyncNodeSocket('/members', {});
		this.sync.on('updated', (data) => {
			var id = SV.param('id'); 
			var member;
			SV.toArray(data).forEach((currMember) => {
				if(currMember.data.info.emailVerificationId === id) {
					member = currMember;
				}
			});
			if(member) this.update(member);
		});



		SV.el('h1', {
			parent: this.node,
			innerHTML: 'Verify Email Address',
			className: 'light' });
		
		this.mainView = SV.el('div', { parent: this.node});

		this.message = SV.el('h3', {
			parent: this.mainView,
			innerHTML: 'Invalid ID',
			className: 'light' });

		this.form = SV.el('form', {
			parent: this.mainView,
		        events: {
				submit: (e) => {
					this.verify();
					e.preventDefault();
				}
			}});
		var div = SV.el('div', { parent: this.form, className: 'group' });
		SV.el('label', { parent: div, innerHTML: 'New Password', 
			style: { display: 'inline-block', width: '10em' }});
		this.passwordInput = SV.el('input', { 
			parent: div, 
			type: 'password',
	       		events: { keyup: () => { this.validatePassword(); }}});
		var div = SV.el('div', { parent: this.form, className: 'group'});
		SV.el('label', { parent: div, innerHTML: 'Confirm Password', 
			style: { display: 'inline-block', width: '10em' }});
		this.passwordConfirmInput = SV.el('input', { 
			parent: div, 
			type: 'password',
	       		events: { keyup: () => { this.validatePassword(); }}});

		this.completeButton = SV.el('input', {
			parent: this.form,
			value: 'Make me a member!',
			type: 'submit',
			style: {
				marginTop: '1em',
				fontSize: '1em'
			}});
	}
	validatePassword() {
		var password = this.passwordInput.value;
		var passwordConfirm = this.passwordConfirmInput.value;
		if((password.length >= 4) && (password === passwordConfirm)) {
			this.completeButton.disabled = false;
			return true;
		} else {
			this.completeButton.disabled = true;
			return false;
		}

	}
	verify() {
		if(this.validatePassword) {
			this.data.merge({ password: this.passwordInput.value, data: { info: { isEmailVerified: true }}});
			window.location = '/member';
		}	
	}	
	render() {
		if(this.data) {
			this.mainView.style.display = 'default';
			this.message.innerHTML = `Hello ${this.data.data.info.name}, you're almost done!`;
		} else {
			this.mainView.style.display = 'none';
		}
		this.validatePassword();
	}
}

SV.startReloader();

var t = new Verify();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });


