"use strict"

class LoginTab extends Tab {
	constructor() {
		super();

		this.title = 'Login';
		this.node.style.position = 'relative';

		var form = SV.el('form', { parent: this.node, method: 'post' });
		SV.el('input', { parent: form, name: 'username' });
		SV.el('input', { parent: form, name: 'password', type: 'password' });
		SV.el('input', { parent: form, type: 'submit', value: 'Login' });
		var fbButton = SV.el('a', { parent: this.node, alt: 'Login with Facebook',
				href: '/auth/facebook' });
		SV.el('img', { parent: fbButton, src: '/imgs/facebook_login.png',
	       			style: { width: '100%', maxWidth: '300px' }});

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

		SV.el('h1', { parent: this.node, innerHTML: 'Login' });


		this.tabs = new TabView();
		this.tabs.node.style.marginTop = '2em';
		this.node.appendChild(this.tabs.node);


		this.loginTab = new LoginTab();
		this.tabs.addTab(this.loginTab);
		this.tabs.showTab(this.loginTab);
				
		this.signUpTab = new SignUpTab();
		this.tabs.addTab(this.signUpTab);

	}
	render() {
	}
}


SV.startReloader();

var t = new LoginOrSignup();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
