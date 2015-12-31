"use strict"


class Sign extends SyncView {
	constructor() {
		super();

		el('h1', {
			parent: this.node,
			innerHTML: 'Display Controls',
			className: 'light' });
		el('button', { parent: this.node, innerHTML: 'Launch', 
			events: { click: launchApp }});
		el('button', { parent: this.node, innerHTML: 'Cycle', 
			events: { click: () => { this.sendMessage('cycle'); } }});
		el('button', { parent: this.node, innerHTML: 'Stop Cycle', 
			events: { click: () => { this.sendMessage('stop cycle'); } }});
		el('button', { parent: this.node, innerHTML: 'Sign 1', 
			events: { click: () => { this.sendMessage('sign1'); } }});
		el('button', { parent: this.node, innerHTML: 'Sign 2', 
			events: { click: () => { this.sendMessage('sign2'); } }});
		el('button', { parent: this.node, innerHTML: 'Sign 3', 
			events: { click: () => { this.sendMessage('sign3'); } }});
		el('button', { parent: this.node, innerHTML: 'Sign 4', 
			events: { click: () => { this.sendMessage('sign4'); } }});
	}
	sendMessage(message) {
		session.sendMessage('urn:x-cast:com.google.cast.sample.helloworld', message, 
				() => { console.log('message sent: ' + message); },
				(err) => { console.log('failed to send message: ' + message); });
			
	}
	render() {
	}
}





//SV.startReloader();

var el = SV.el; // For convenience

var view = new Sign();
SV.id('container').appendChild(view.node);

// var sv = new SV();
// sv.onupdated = () => {
// 	t.update(sv.db.loyalty);
// };

// sv.startSync();

var session;

function onInitSuccess() {
	console.log('init success');
}

function onError(e) {
	console.log('Error', e);
}

var initializeCastApi = function() {
	var sessionRequest = new chrome.cast.SessionRequest('834A1114');
	var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
			sessionListener,
			receiverListener);
	chrome.cast.initialize(apiConfig, onInitSuccess, onError);
};

function receiverListener(e) {
	if( e === chrome.cast.ReceiverAvailability.AVAILABLE) {
		console.log('available');
	} else {
		console.log('recevier', e);
	}
}

function sessionListener(e) {
	session = e;
	console.log('sessionListener', session);
	if (session.media.length != 0) {
		//onMediaDiscovered('onRequestSessionSuccess', session.media[0]);		
	}
}

function launchApp() {
	console.log("launching app...");
	chrome.cast.requestSession(onRequestSessionSuccess, onError);
}

function onRequestSessionSuccess() {
	console.log('session success!');
}

window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
	if (loaded) {		
		initializeCastApi();
		console.log('loaded');
	} else {
		console.log(errorInfo);
	}
}


