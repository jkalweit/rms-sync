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
					this.add();
					e.preventDefault();
				}
			}});
		this.addInput = SV.el('input', {
			parent: this.addView,
			type: 'file',
			accept: 'image/*',
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

		this.preview = SV.el('img', { 
			parent: this.addView });
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


SV.startReloader();

var t = new Menu();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
