"use strict"


class NewOrderModal extends Modal {
	constructor() {
		super();

		SV.el('h2', { parent: this.mainView, innerHTML: 'New Order' });
		this.nameInput = SV.el('input', { parent: this.node });
		this.nameInput.style.display = 'block';
		this.nameInput.style.marginBottom = '10px';
		SV.el('button', { parent: this.node, innerHTML: 'Create Order',
			className: 'btn-big',
			events: { click: () => {
					var title = this.nameInput.value.trim();	
					if(title == '') {
						alert('Title cannot be blank.');
						this.nameInput.focus();
						return;
					}
					this.emit('create', title);
					this.hide();
			}}});
		SV.el('button', { parent: this.node, innerHTML: 'Cancel',
			className: 'btn-big',
			events: { click: () => { this.hide(); }}});
	}
	render() {
	}
}


class Progress extends SyncView {
	constructor() {
		super();


		this.sync = new SyncNodeSocket('/progress', {});
		this.sync.onUpdated((data) => {
			if(!data.orders) {
				data.set('orders', {});
			} else {
				this.update(data);
			}
		});

		this.newOrderModal = new NewOrderModal();
		this.newOrderModal.on('create', this.createOrder.bind(this));
		this.node.appendChild(this.newOrderModal.node);


		SV.el('h1', {
			parent: this.node,
			innerHTML: 'Progress',
			className: 'light' });

		this.mainView = SV.el('div', { parent: this.node,
			style: { width: '100%' }});

		
		SV.el('button', {
			parent: this.mainView,
			innerHTML: 'Add New Order',
			className: 'btn-big',
	       		events: { click: () => { this.newOrderModal.show(); }}});

		this.itemsContainer = new ViewsContainer(ProcedureListItem);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (procedure) => { 
				this.selectedProcedure = procedure;
				this.render();
			});
		});
		this.mainView.appendChild(this.itemsContainer.node);

		this.detailsView = SV.el('div', { parent: this.node,
			style: { width: '100%' }});

		this.selectedProcedure = null;
		this.selectedProcedureView = new Procedure();
		this.selectedProcedureView.on('closed', () => {
			//this.selectedProcedure = null;
			//this.render();
			window.location = '/progress';
		});
 		this.detailsView.appendChild(this.selectedProcedureView.node);
	}
	createOrder(title) {
		var item = {
			key: new Date().toISOString(),
			title: title,
			email: '',
			steps: {}
		};
		this.data.set(item.key, item);
	}
	render() {
		var id = SV.param('id');
		if(id && !this.selectedProcedure) {
			this.selectedProcedure = this.data[id];
		}
		this.mainView.style.display = this.selectedProcedure ? 'none' : 'block';	
		this.detailsView.style.display = this.selectedProcedure ? 'block' : 'none';
		if(this.selectedProcedure) {
			this.selectedProcedure = this.data[this.selectedProcedure.key];
			this.selectedProcedureView.update(this.selectedProcedure);
		} else {
			this.itemsContainer.update(this.data);
		}
	}
}

class ProcedureListItem extends SyncView {
	constructor() {
		super();

		this.node.className = 'group';
		this.title = SV.el('a', { parent: this.node, className: 'btn',
			style: { fontSize: '1.5em', display: 'block', width: '100%' },
	       		events: { click: () => { this.emit('selected', this.data); }}});
	}
	render() {
		this.title.innerHTML = this.data.title;
		this.title.href = '/progress?id=' + this.data.key;
	}
}

class Procedure extends SyncView {
	constructor() {
		super();

		this.mainView = SV.el('div', { parent: this.node});
		
		SV.el('button', {
			parent: this.mainView,
			className: 'btn',
			innerHTML: 'Delete',
			style: { float: 'right' },
	       		events: { click: () => { this.remove(); }}});
		
		SV.el('button', {
			parent: this.mainView,
			className: 'btn',
			innerHTML: 'Close',
			style: { float: 'right' },
	       		events: { click: () => { this.emit('closed', this.data); }}});

		SV.el('button', {
			parent: this.mainView,
			className: 'btn',
			innerHTML: 'Add Progress',
			style: { float: 'left' },
	       		events: { click: () => { this.add(); }}});


		SV.el('button', {
			parent: this.mainView,
			className: 'btn',
			innerHTML: 'Send Email',
			style: { float: 'left' },
	       		events: { click: () => { this.sendEmail(); }}});

		var details = SV.el('div', { parent: this.node, 
			style: { clear: 'both', paddingTop: '2em' }});

		this.title = new EditInput(SV.el('h3', { className: 'light' }),
				'title', {}, 'Title');
		details.appendChild(this.title.node);
		this.email = new EditInput(SV.el('h3', { className: 'light' }),
				'email', {}, 'Enter email address');
		details.appendChild(this.email.node);


		this.itemsContainer = new ViewsContainer(ProcedureStep, 'key', 'reverse');
		this.node.appendChild(this.itemsContainer.node);
	}
	remove() {
		if(confirm('Delete this order: "' + this.data.title + '"?')) {
			// first delete all images:
			SV.toArray(this.itemsContainer.views).forEach((view) => { view.removeImage(); });
			this.emit('closed', this.data);
			this.data.parent.remove(this.data.key);
		}
	}
	add() {
		var item = {
			key: new Date().toISOString(),
			title: moment().format('ddd, MMM Do, h:mmA'),
			description: ''
		};
		this.data.steps.set(item.key, item);
	}
	sendEmail() {
		if(!this.data.email) {
			alert('Cannot send email: no email address');
			return;
		}
		SV.sendEmailFromAdmin({
			address: this.data.email,
			subject: 'Progress on ' + this.data.title,
			htmlBody: `View the progress of your order: https://www.thecoalyard.com/progress?id=${this.data.key}`
		});	
	}
	render() {
		this.title.update(this.data);
		this.email.update(this.data);
		this.itemsContainer.update(this.data.steps);
	}
}


class ProcedureStep extends SyncView {
	constructor() {
		super();

		SV.mergeMap({ padding: '2em', marginTop: '1em' }, this.node.style);

		this.mainView = SV.el('div', { parent: this.node});

		SV.el('button', {
			parent: this.mainView,
			className: 'btn',
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
		if(confirm('Delete this step: "' + this.data.title + '"?')) {
			this.removeImage();
			this.data.parent.remove(this.data.key);
		}
	}
	render() {
		this.title.update(this.data);
		this.description.innerHTML = this.data.description;
		this.imageUploader.update(this.data);
	}
}




SV.startReloader();

var t = new Progress();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
