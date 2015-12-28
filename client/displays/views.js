"use strict"


class Sign extends SyncView {
	constructor() {
		super();

		el('h1', {
			parent: this.node,
			innerHTML: 'A Display!',
			className: 'light' });
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

window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
window.castReceiverManager.start();



