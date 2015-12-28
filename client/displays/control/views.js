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


