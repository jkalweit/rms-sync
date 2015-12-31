"use strict"

class UserInfo extends SyncView {
	constructor() {
		super();

		this.emailText = el('h4', {
			parent: this.node,
			className: 'light' });
	}
	render() {
		this.emailText.innerHTML = this.data.email;
	}
}

class Login extends SyncView {
	constructor() {
		super();

		this.nameText = el('h1', {
			parent: this.node,
			innerHTML: 'Login',
			className: 'light' });

		this.userInfo = new UserInfo();
		this.node.appendChild(this.userInfo.node);		

		this.loginButton = el('button', {
			parent: this.node,
			innerHTML: 'Login',
			style: { display: 'none' },
			events: { click: () => { 
				console.log('Do login...'); 
				FB.login((response) => { 
					console.log('login response', response);
			       		this.getLoginStatus();
				}, {scope: 'email'}); 
			}}
		});
		this.logoutButton = el('button', {
			parent: this.node,
			innerHTML: 'Logout',
			style: { display: 'none' },
			events: { click: () => { 
				console.log('Do logout...'); 
				FB.logout((response) => { 
					console.log('logout response', response); 
					this.getLoginStatus();
				}); 
			}}
		});

	}
	setUser(user) {
		this.user = user;
		this.emit('userChanged', this.user);
	}
	statusChangeCallback(response) {
		console.log('statusChangeCallback');
		console.log(response);
		if (response.status === 'connected') {
			this.getUserDetails();
		} else if (response.status === 'not_authorized') {
			// The person is logged into Facebook, but not your app.
			console.log('Please log into this app.');
		} else {
			// The person is not logged into Facebook, so we're not sure if
			// they are logged into this app or not.
			console.log('Please log into this app.');
			this.setUser(null);
		}
		this.render();
	}
	fbAsyncInit() {
		FB.init({
			appId: '831200096928000',
			xfbml: true,
			cookie: true,
			version: 'v2.5'
		});
		this.getLoginStatus();
	}
	getLoginStatus() {
		FB.getLoginStatus((response) => {
			this.statusChangeCallback(response);
		});
	}
	checkLoginState() {
		FB.getLoginStatus(function(response) {
			this.statusChangeCallback(response);
		});
	}
	getUserDetails() {
		console.log('Welcome!  Fetching your information.... ');
		FB.api('/me?fields=id,name,email,permissions', (response) => {
			console.log('Successful login for: ', response);
			this.setUser(response);
			this.render();
			//document.getElementById('status').innerHTML =
			//  'Thanks for logging in, ' + response.name + '!';
		});
	}
	start() {
		window.fbAsyncInit = this.fbAsyncInit.bind(this);

		(function(d, s, id){
			var js, fjs = d.getElementsByTagName(s)[0];
			if (d.getElementById(id)) {return;}
			js = d.createElement(s); js.id = id;
			js.src = "//connect.facebook.net/en_US/sdk.js";
			fjs.parentNode.insertBefore(js, fjs);
		}(document, 'script', 'facebook-jssdk'));
	}
	render() {
		this.nameText.innerHTML = this.user ? this.user.name : 'Login';
		if(this.user) {
			this.userInfo.update(this.user);
		}
		this.userInfo.node.style.display = this.user ? 'initial' : 'none';
		this.loginButton.style.display = this.user ? 'none' : 'initial';
		this.logoutButton.style.display = !this.user ? 'none' : 'initial';
	}
}



//SV.startReloader();

//var el = SV.el;

//var view = new Login();
//SV.id('container').appendChild(view.node);
//view.start();

//var sv = new SV();
//sv.onupdated = () => {
//	if(!sv.db.notes){
//		sv.db.set('notes', { members: {} });
//	} else {
//		view.update(sv.db.notes);
//	}
//};

//sv.startSync();
