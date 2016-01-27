"use strict"


class Specials extends SyncView {
	constructor() {
		super();
	
		

		this.mainView = SV.el('div', { parent: this.node});

		SV.el('h1', {
			parent: this.mainView,
			innerHTML: 'Specials',
			className: 'light' });

		this.imageUploader = new ImageUploader('specials1');
		this.imageUploader.on('uploaded', (id) => {
			console.log('uploaded:', id);
		});
		this.imageUploader.node.style.width = '150px';
		this.imageUploader.node.style.height = '150px';
		this.mainView.appendChild(this.imageUploader.node);
	}
	add() {
		this.uploadPhotos(this.addInput.files[0], this.preview);
	}	
	render() {
	}
}


class ImageUploader extends SyncView {
	constructor(destination, maxSize) {
		super();
	
		this.destination = destination;
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
			src: this.src(),
		       style: { width: '100%' }, 
		       events: { click: () => { this.addInput.click(); },
		       		error: (e) => { e.target.src = '/imgs/no_image.png'; }
		       }});
	}
	src() {
		return '/images/' + this.destination + '.jpg';
	}
	add() {
		this.uploadPhotos(this.addInput.files[0], this.preview);
	}	
	render() {
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
					console.log('done!', dataUrl);					
					container.src = dataUrl;
					var resizedImage = this.dataURLToBlob(dataUrl);
					console.log('blob', resizedImage);

					var form = new FormData();
					form.append('destination', this.destination);
					form.append('image', resizedImage);					
					var xhr = new XMLHttpRequest();
					xhr.open('POST', '/upload', true);
					xhr.responseType = 'text';
					console.log('sending request');
					xhr.onload = () => {
						console.log('onload');
						if(xhr.readyState === xhr.DONE) {
							console.log('done');
							if(xhr.status === 200) {
								console.log('200');
								console.log('xhr.response', xhr.response);
								console.log('xhr.responseText', xhr.responseText);
								this.preview.src = this.src() + '?' + Date.now();
								this.emit('uploaded', this.destination, this.src());
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

var t = new Specials();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
