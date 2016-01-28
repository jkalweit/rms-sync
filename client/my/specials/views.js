"use strict"


class Specials extends SyncView {
	constructor() {
		super();
	
		this.sync = new SyncNodeSocket.SyncNodeSocket('/data', {});
		this.sync.onUpdated((data) => {
			if(!data.specials) data.set('specials', {});
			else this.update(data.specials);
		});

		this.mainView = SV.el('div', { parent: this.node});

		SV.el('h1', {
			parent: this.mainView,
			innerHTML: 'Specials',
			className: 'light' });

		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Add',
			className: 'btn-big',
	       		events: { click: () => { this.add(); }}});

		this.itemsContainer = new ViewsContainer(Special);
		this.node.appendChild(this.itemsContainer.node);
	}
	add() {
		var special = {
			key: new Date().toISOString(),
			title: 'New Special',
			description: 'description of special'
		};
		this.data.set(special.key, special);
	}
	render() {
		this.itemsContainer.update(this.data);
	}
}


class Special extends SyncView {
	constructor() {
		super();
	
		this.mainView = SV.el('div', { parent: this.node});

		this.title = SV.el('h1', {
			parent: this.mainView,
			className: 'light' });
		this.description = SV.el('span', {
			parent: this.mainView });

		this.imageUploader = new ImageUploader();
		this.imageUploader.node.style.width = '450px';
		this.imageUploader.on('uploaded', (path) => {
			console.log('path', path, this.data);
			this.data.set('image', path);
			this.imageUploader.reloadPreview();
			console.log('after', this.data);
		});
		this.mainView.appendChild(this.imageUploader.node);
		
		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Delete',
			className: 'btn-big',
			events: { click: () => { this.remove(); }}});
	}
	remove() {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/deleteupload');
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify({ image: this.data.image }));
		this.data.parent.remove(this.data.key);
	}
	render() {
		console.log('render special');
		this.title.innerHTML = this.data.title;
		this.description.innerHTML = this.data.description;
		this.imageUploader.update(this.data);
	}
}


SV.startReloader();

var t = new Specials();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
