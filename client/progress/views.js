"use strict"


class Progress extends SyncView {
	constructor() {
		super();


		this.sync = new syncnodesocket('/members', {});
		this.sync.onupdated((data) => {
			this.update(data);
		});


		this.mainView = SV.el('div', { parent: this.node,
			style: { width: '200px', float: 'left' }});

		SV.el('h1', {
			parent: this.mainView,
			innerHTML: 'Procedures',
			className: 'light' });
		
		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Add',
			className: 'btn-big',
	       		events: { click: () => { this.add(); }}});

		this.itemsContainer = new ViewsContainer(ProcedureListItem);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (procedure) => { 
				this.selectedProcedure = procedure;
				this.render();
			});
		});
		this.mainView.appendChild(this.itemsContainer.node);

		this.detailsView = SV.el('div', { parent: this.node,
			style: { width: '400px', float: 'left', backgroundColor: '#EEE' }});

		this.selectedProcedure = null;
		this.selectedProcedureView = new Procedure();
		this.selectedProcedureView.on('closed', () => {
			this.selectedProcedure = null;
			this.render();
		});
 		this.detailsView.appendChild(this.selectedProcedureView.node);
	}
	add() {
		var item = {
			key: new Date().toISOString(),
			title: 'New Procedure',
			steps: {}
		};
		this.data.set(item.key, item);
	}
	render() {
		this.itemsContainer.update(this.data);
		if(this.selectedProcedure) {
			this.selectedProcedure = this.data[this.selectedProcedure.key];
		}
		this.selectedProcedureView.node.style.display = this.selectedProcedure ? 'initial' : 'none';
		if(this.selectedProcedure) {
			this.selectedProcedureView.update(this.selectedProcedure);
		}
	}
}

class ProcedureListItem extends SyncView {
	constructor() {
		super();

		this.node.className = 'group';
		this.title = SV.el('h5', { parent: this.node,
	       		events: { click: () => { this.emit('selected', this.data); }}});
	}
	render() {
		this.title.innerHTML = this.data.title;
	}
}

class Procedure extends SyncView {
	constructor() {
		super();

		this.mainView = SV.el('div', { parent: this.node});
		
		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Delete',
			style: { float: 'right' },
	       		events: { click: () => { this.remove(); }}});
		
		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Close',
			style: { float: 'right' },
	       		events: { click: () => { this.emit('closed', this.data); }}});

		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Add Step',
			style: { float: 'right' },
	       		events: { click: () => { this.add(); }}});

		this.title = new EditInput(SV.el('h3', { className: 'light' }),
				'title', { fontSize: '1em' });
		
		this.mainView.appendChild(this.title.node);
		this.itemsContainer = new ViewsContainer(ProcedureStep);
		this.node.appendChild(this.itemsContainer.node);
	}
	remove() {
		if(confirm('Delete this procedure: "' + this.data.title + '"?')) {
			// first delete all images:
			SV.toArray(this.itemsContainer.views).forEach((view) => { view.removeImage(); });
			this.data.parent.remove(this.data.key);
			this.emit('closed', this.data);
		}
	}
	add() {
		var item = {
			key: new Date().toISOString(),
			title: 'New Step',
			description: ''
		};
		this.data.steps.set(item.key, item);
	}
	render() {
		this.title.update(this.data);
		this.itemsContainer.update(this.data.steps);
	}
}


class ProcedureStep extends SyncView {
	constructor() {
		super();
	
		this.mainView = SV.el('div', { parent: this.node});

		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Delete',
			style: { float: 'right' },
			events: { click: () => { this.remove(); }}});

		this.title = new EditInput(SV.el('h5', { className: 'light' }),
				'title', { fontSize: '1em' });
		this.mainView.appendChild(this.title.node);

		this.description = SV.el('span', {
			parent: this.mainView });

		this.imageUploader = new ImageUploader();
		this.imageUploader.node.style.width = '100%';
		this.imageUploader.on('uploaded', (path) => {
			console.log('path', path, this.data);
			this.data.set('image', path);
			this.imageUploader.reloadPreview();
			console.log('after', this.data);
		});
		this.mainView.appendChild(this.imageUploader.node);
		
	}
	removeImage() {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/deleteupload');
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.send(JSON.stringify({ image: this.data.image }));
	}
	remove() {
		this.removeImage();
		this.data.parent.remove(this.data.key);
	}
	render() {
		this.title.update(this.data);
		this.description.innerHTML = this.data.description;
		this.imageUploader.update(this.data);
	}
}




SV.startReloader();

var t = new Procedures();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
