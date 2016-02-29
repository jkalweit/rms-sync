"use strict"

class LoginTab extends Tab {
	constructor() {
		super();

		this.title = 'Login';
		this.node.style.position = 'relative';

		var fbButton = SV.el('a', { parent: this.node, alt: 'Login with Facebook',
				href: '/auth/facebook',
	       			style: { display: 'block', textAlign: 'center' }});
		SV.el('img', { parent: fbButton, src: '/imgs/facebook_login.png',
	       			style: { width: '100%', maxWidth: '300px' }});
	
		SV.el('h2', { parent: this.node, innerHTML: 'OR',
	       		style: { textAlign: 'center', margin: '2em' }});
		SV.el('p', { parent: this.node, innerHTML: 'Login with your email address',
	       		style: { fontWeight: 'bold' }}); 


		var form = SV.el('form', { parent: this.node, method: 'post' });
		SV.el('input', { parent: form, name: 'username' });
		SV.el('input', { parent: form, name: 'password', type: 'password' });
		SV.el('input', { parent: form, type: 'submit', value: 'Login' });
		
		SV.el('h2', { parent: this.node, innerHTML: 'OR',
	       		style: { textAlign: 'center', margin: '2em' }});
		SV.el('p', { parent: this.node, innerHTML: 'Signup with your email address',
	       		style: { fontWeight: 'bold' }}); 
		SV.el('p', { parent: this.node, innerHTML:  'We\'ll send you an email with a link to complete signup.' });

		
		
		form = SV.el('form', { parent: this.node, method: 'post' });
		SV.el('input', { parent: form, name: 'email' });
		SV.el('input', { parent: form, type: 'submit', value: 'Signup' });
	}
	render() {		
	}
}

class SignUpTab extends Tab {
	constructor() {
		super();

		this.title = 'Sign Up';
	}
	render() {
	}
}


class LoginOrSignup extends SyncView {
	constructor() {
		super();

		this.node.style.textAlign = 'center';

		SV.el('img', { parent: this.node, src: '/imgs/logo_york.png',
		       style: { width: '100%', maxWidth: '200px' }});

		var card = SV.el('div', { parent: this.node, className: 'card' });

		SV.el('h2', { parent: card, innerHTML: 'Login or Signup with Facebook' });
		var fbButton = SV.el('a', { parent: card, alt: 'Login with Facebook',
				href: '/auth/facebook',
	       			style: { display: 'block', textAlign: 'center' }});
		SV.el('img', { parent: fbButton, src: '/imgs/facebook_login.png',
	       			style: { width: '100%', maxWidth: '300px' }});
		

		card = SV.el('div', { parent: this.node, className: 'card' });
	
		SV.el('h2', { parent: card, innerHTML: 'Login with your email address',
	       		style: { fontWeight: 'bold' }}); 


		var form = SV.el('form', { parent: card, method: 'post' });
		SV.el('input', { parent: form, name: 'username',
			style: { display: 'block', width: '100%' }});
		SV.el('input', { parent: form, name: 'password', type: 'password',
			style: { display: 'block', width: '100%' }});
		SV.el('input', { parent: form, type: 'submit', value: 'Login', 
			style: { display: 'block', width: '100%' }});
	

		card = SV.el('div', { parent: this.node, className: 'card' });
		SV.el('h2', { parent: card, innerHTML: 'Signup with your email address',
	       		style: { fontWeight: 'bold' }}); 
		SV.el('p', { parent: card, innerHTML:  'We\'ll send you an email with a link to complete signup :)' });
		this.emailSignupInput = SV.el('input', { parent: card, name: 'email', type: 'email',
	       		style: { display: 'block', width: '100%' }});
		SV.el('input', { parent: card, type: 'submit', value: 'Send Signup Email',
	       		style: { display: 'block', width: '100%' },
			events: { click: () => { this.sendSignupEmail(); }}});


		//this.tabs = new TabView();
		//this.tabs.node.style.marginTop = '2em';
		//this.node.appendChild(this.tabs.node);


		//this.loginTab = new LoginTab();
		//this.tabs.addTab(this.loginTab);
		//this.tabs.showTab(this.loginTab);
				
		// this.signUpTab = new SignUpTab();
		// this.tabs.addTab(this.signUpTab);


	}
	isValidEmail(email) {
		var re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
		return re.test(email);
	}
	sendSignupEmail() {
		var email = this.emailSignupInput.value;
		if(!this.isValidEmail(email)) {
			alert('Please enter a valid email address.');
			return;
		}	
		SV.sendEmailFromAdmin({
			address: email,
			subject: 'Welcome to the Coal Yard!',
			htmlBody: 'Put the link here'
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
