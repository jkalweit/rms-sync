"use strict"



class Menu extends SyncView {
	constructor() {
		super();
	
		this.sync = new SyncNodeSocket('/data', {});
		this.sync.on('updated', (data) => {
			if(!data.menu) {
				data.set('menu', { items: {} });
			} else { 
				this.update(data.menu);
			}
		});


		SV.el('h1', {
			parent: this.node, innerHTML: 'Menu' });

		this.addView = SV.el('form', {
			parent: this.node,
		        events: {
				submit: (e) => {
					this.addItem();
					e.preventDefault();
				}
			}});
		this.addInput = SV.el('input', {
			parent: this.addView,
			style: {
				width: 'calc(100% - 4em)'
			}});
		SV.el('input', {
			parent: this.addView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '1.5em',
			}});
		
		this.itemsContainer = new ViewsContainer(MenuItem);
		this.itemsContainer.node.style.marginTop = '2em';
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (menuItem) => {
				this.editMenuItemModal.update(menuItem);
				this.editMenuItemModal.show();
			});
		});
		this.node.appendChild(this.itemsContainer.node);

		this.editMenuItemModal = new MenuItemEditModal();
		this.node.appendChild(this.editMenuItemModal.node);
	}
	addItem() {
		var menuItem = {
			key: SyncNode.guidShort(),
			created: new Date().toISOString(),
			name: this.addInput.value,
			description: '',
			price: 0
		};
		this.addInput.value = '';
		var result = this.data.items.set(menuItem.key, menuItem)[menuItem.key];
		console.log('result', result);
		this.editMenuItemModal.update(result);
		this.editMenuItemModal.show();

	}	
	render() {
		this.itemsContainer.update(this.data.items);
	}




	uploadPhotos(file, container){

		// Ensure it's an image
		if(file.type.match(/image.*/)) {
			console.log('An image has been loaded');

			// Load the image
			var reader = new FileReader();
			reader.onload = (readerEvent) => {
				var image = new Image();
				image.onload = (imageEvent) => {

					// Resize the image
					var canvas = document.createElement('canvas'),
					    max_size = 640,// TODO : pull max size from a site config
					    width = image.width,
					    height = image.height;
					if (width > height) {
						if (width > max_size) {
							height *= max_size / width;
							width = max_size;
						}
					} else {
						if (height > max_size) {
							width *= max_size / height;
							height = max_size;
						}
					}
					canvas.width = width;
					canvas.height = height;
					canvas.getContext('2d').drawImage(image, 0, 0, width, height);
					var dataUrl = canvas.toDataURL('image/jpeg');
					console.log('done!', dataUrl);					
					container.src = dataUrl;
					var resizedImage = this.dataURLToBlob(dataUrl);
					console.log('blob', resizedImage);

					var form = new FormData();
					form.append('image', resizedImage);					
					var request = new XMLHttpRequest();
					request.open('POST', '/upload', true);
					request.send(form);					
				}
				image.src = readerEvent.target.result;
			}
			reader.readAsDataURL(file);
		}
	}


	/* Utility function to convert a canvas to a BLOB */
	dataURLToBlob(dataURL) {
		var BASE64_MARKER = ';base64,';
		if (dataURL.indexOf(BASE64_MARKER) == -1) {
			var parts = dataURL.split(',');
			var contentType = parts[0].split(':')[1];
			var raw = parts[1];

			return new Blob([raw], {type: contentType});
		}

		var parts = dataURL.split(BASE64_MARKER);
		var contentType = parts[0].split(':')[1];
		var raw = window.atob(parts[1]);
		var rawLength = raw.length;

		var uInt8Array = new Uint8Array(rawLength);

		for (var i = 0; i < rawLength; ++i) {
			uInt8Array[i] = raw.charCodeAt(i);
		}

		return new Blob([uInt8Array], {type: contentType});
	}

}


class MenuItem extends SyncView {
	constructor() {
		super();

		var btn = SV.el('div', { parent: this.node, className: 'btn btn-wide', 
	       		events: { click: () => { this.emit('selected', this.data); }}});


		this.nameSpan = SV.el('span', { parent: btn, 
			style: { fontWeight: 'default' }});
		this.price = SV.el('span', { parent: btn, 
			style: { fontWeight: 'default', float: 'right' }});
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;	
		this.price.innerHTML = SV.formatCurrency(this.data.price);
	}
}

class MenuItemEditModal extends Modal {
	constructor() {
		super();
		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Menu Item' });
		this.views = [];
		this.views.push(this.appendView(new SimpleEditInput('name', 'Name'), this.mainView));
		this.views.push(this.appendView(new SimpleEditInput('description', 'Description'), this.mainView));
		this.views.push(this.appendView(new SimpleEditInput('price', 'Price'), this.mainView));
		this.views.push(this.appendView(new SimpleEditSelect('taxType', 'Tax Type', null, null, ['9%', 'Included']), this.mainView));

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });
		SV.el('button', { parent: footer, innerHTML: 'Ok', className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
		SV.el('button', { parent: footer, innerHTML: 'Delete', className: 'btn btn-big', 
			style: { float: 'left' },
			events: { click: () => { 
					Modal.confirm('Delete Menu Item', 'Delete this item?', () => {
						this.data.parent.remove(this.data.key); this.hide(); 
					});
				}
			}});
	}
	render() {
		SyncView.updateViews(this.views, this.data);
	}
}


SV.startReloader();

var t = new Menu();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
