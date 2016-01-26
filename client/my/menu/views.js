"use strict"



class Menu extends SyncView {
	constructor() {
		super();
	
		this.mainView = SV.el('div', { parent: this.node});

		SV.el('h1', {
			parent: this.mainView,
			innerHTML: 'Menu',
			className: 'light' });

		this.addView = SV.el('form', {
			parent: this.mainView,
			action: '/upload',
			enctype: 'multipart/form-data',
			method: 'post',
		        events: {
				submit: (e) => {
					//this.add();
					//e.preventDefault();
				}
			}});
		this.addInput = SV.el('input', {
			parent: this.addView,
			type: 'file',
			name: 'image',
			style: {
				fontSize: '1em',
				width: 'calc(100% - 4em)'
			}});
		SV.el('input', {
			parent: this.addView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '1em',
			}});
	}
	add() {
		var text = this.addInput.value.trim();
		if(!text) return;
		var created = new Date().toISOString();
		var newItem = {
			key: created,
			text: text,
			acknowledgements: {}
		};
		this.data.set(newItem.key, newItem);
		this.addInput.value = '';
	}	
	render() {
		var arr = SV.toArray(this.data, 'key', 'reverse');
		this.itemsContainer.update(arr);
	}
}
SV.startReloader();

var t = new Menu();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
