"use strict"

class LoginOrSignup extends SyncView {
	constructor() {
		super();

		this.node.style.textAlign = 'center';

		SV.el('img', { parent: this.node, src: '/imgs/logo_york.png',
		       style: { width: '100%', maxWidth: '200px' }});

		var card = SV.el('div', { parent: this.node, className: 'card' });

		SV.el('h2', { parent: card, innerHTML: 'Signup or Login with Facebook' });
		
		var uri = window.location.search.replace(/\?url=/g, '').replace(/\//g, '%2f');
		console.log('url', window.location.search, uri);
		var href = '/auth/facebook/' + uri;
		var fbButton = SV.el('a', { parent: card, alt: 'Login with Facebook',
				href: href,
	       			style: { display: 'block', textAlign: 'center' }});
		SV.el('img', { parent: fbButton, src: '/imgs/facebook_login.png',
	       			style: { width: '100%', maxWidth: '300px' }});
		

		card = SV.el('div', { parent: this.node, className: 'card' });
	
		SV.el('h2', { parent: card, innerHTML: 'Login with your email address',
	       		style: { fontWeight: 'bold' }}); 


		var form = SV.el('form', { parent: card, method: 'post', action: '/login/' + uri  });
		SV.el('input', { parent: form, name: 'username',
			style: { display: 'block', width: '100%' }});
		SV.el('input', { parent: form, name: 'password', type: 'password',
			style: { display: 'block', width: '100%' }});
		SV.el('input', { parent: form, type: 'submit', value: 'Login', 
			style: { display: 'block', width: '100%' }});
	
/*
		card = SV.el('div', { parent: this.node, className: 'card' });
		SV.el('h2', { parent: card, innerHTML: 'Signup with your email address',
	       		style: { fontWeight: 'bold' }}); 
		SV.el('p', { parent: card, innerHTML:  '1) We\'ll send you an email.</br>2) Click on the link in the email to confirm your email address.<br/> 3) You\'re a member!', style: { textAlign: 'left' }});
		this.emailSignupInput = SV.el('input', { parent: card, name: 'email', type: 'email',
	       		style: { display: 'block', width: '100%' }});
		SV.el('input', { parent: card, type: 'submit', value: 'Send Signup Email',
	       		style: { display: 'block', width: '100%' },
			events: { click: () => { this.sendSignupEmail(); }}});
*/

		//this.tabs = new TabView();
		//this.tabs.node.style.marginTop = '2em';
		//this.node.appendChild(this.tabs.node);


		//this.loginTab = new LoginTab();
		//this.tabs.addTab(this.loginTab);
		//this.tabs.showTab(this.loginTab);
				
		// this.signUpTab = new SignUpTab();
		// this.tabs.addTab(this.signUpTab);


	}	
	sendSignupEmail() {
		var email = this.emailSignupInput.value;
		if(!SV.isValidEmail(email)) {
			alert('Please enter a valid email address.');
			return;
		}	
		SV.sendEmailFromAdmin({
			address: email,
			subject: 'Coal Yard Membership Program, almost done!',
			htmlBody: 'Membership is FREE!<br/> Click here to confirm your email address: <a href="https://www.thecoalyard.com/">Confirm Address</a>'
		});
		Modal.showNotification('Email sent!', 'Please check your email and click the link to continue the signup process.');
		this.emailSignupInput.value = '';
	}
	render() {
		var reason = SV.param('reason');
		if(reason && reason.toLowerCase() === 'fbfailed') {
			console.log('fb failed!');
		}
	}
}


SV.startReloader();

var t = new LoginOrSignup();
SV.onLoad(() => { 
	SV.id('container').appendChild(t.node);
	t.render(); // call manually, since not using a SocketSyncNode
});
