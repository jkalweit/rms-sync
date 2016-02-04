"use strict"


class Points extends SyncView {
	constructor() {
		super();
	
		this.sync = new SyncNodeSocket.SyncNodeSocket('/members', {});
		this.sync.onUpdated((data) => {
			if(!data.members) data.set('members', {});
			else this.update(data.members);
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

class ImageUploader extends SyncView {
	constructor(maxSize) {
		super();
	
		this.maxSize = maxSize | 640;

		this.addInput = SV.el('input', {
			parent: this.node,
			type: 'file',
			accept: 'image/*',
			name: 'image',
			style: {
				display: 'none',
				fontSize: '1em',
				width: 'calc(100% - 4em)'
			},
			events: { change: () => { this.add(); }}});

		this.preview = SV.el('img', { 
			parent: this.node,
			style: { width: '100%' }, 
		        events: { click: () => { this.addInput.click(); },
		       		error: (e) => { e.target.src = '/imgs/no_image.png'; }
		        }});
	}
	static src(key) {
		var k = key.replace(/:/g, '_');
		k = k.replace(/\./g, '_');
		k = k.replace(/-/g, '_');
		return k;
	}
	add() {
		this.uploadPhotos(this.addInput.files[0]);
	}	
	reloadPreview() {
		this.preview.src = this.data.image ? '/images/' + this.data.image + '?' + Date.now() : '/imgs/no_image.png';
	}
	render() {
		this.reloadPreview();
	}
	uploadPhotos(file){

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
					    width = image.width,
					    height = image.height;
					if (width > height) {
						if (width > this.maxSize) {
							height *= this.maxSize / width;
							width = this.maxSize;
						}
					} else {
						if (height > this.maxSize) {
							width *= this.maxSize / height;
							height = this.maxSize;
						}
					}
					canvas.width = width;
					canvas.height = height;
					canvas.getContext('2d').drawImage(image, 0, 0, width, height);
					var dataUrl = canvas.toDataURL('image/jpeg');
					var resizedImage = this.dataURLToBlob(dataUrl);

					var form = new FormData();
					form.append('destination', ImageUploader.src(this.data.key));
					form.append('image', resizedImage);					
					var xhr = new XMLHttpRequest();
					xhr.open('POST', '/upload', true);
					xhr.responseType = 'text';
					xhr.onload = () => {
						if(xhr.readyState === xhr.DONE) {
							if(xhr.status === 200) {
								console.log('xhr.responseText', xhr.responseText);
								this.emit('uploaded', xhr.responseText);
							}
						}
					};
					xhr.send(form);	
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


SV.startReloader();

var t = new Points();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
