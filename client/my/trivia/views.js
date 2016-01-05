"use strict"



class Trivia extends SyncView {
	constructor() {
		super();
		this.sync = new SyncNodeSocket.SyncNodeSocket('/trivia', {});

		this.mainView = el('div', { parent: this.node});

		el('h1', {
			parent: this.mainView,
			innerHTML: 'Trivia',
			className: 'light' });

		el('button', {
			parent: this.mainView,
			innerHTML: 'Do Test',
			events: {
				click: () => {
					console.log('doing test');
					this.sync.server.emit('doTest', { text: 'the data' });
				}
			}});

	}
	render() {
	}
}



SV.startReloader();

var el = SV.el;

//var sv = new SV('/trivia');

var view = new Trivia();
SV.id('container').appendChild(view.node);

//sv.onupdated = () => {
	//if(!sv.db.notes){
	//	sv.db.set('notes', { members: {} });
	//} else {
	//	view.update(sv.db.notes);
	//}
//};

//sv.startSync();
