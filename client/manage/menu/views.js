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

		SV.el('input', { parent: this.node, type: 'file', 
			events: { change: (e) => { 
				var f = e.target.files[0];
				var r = new FileReader();
				r.onload = (e) => {
					console.log('here2', e);
					var contents = e.target.result;
					var result = JSON.parse(contents);
					console.log('file', result); 


					var menu = { categories: {} };
					
					result.categories.forEach((cat) => {
						var newCat = {
							key: SyncNode.guidShort(),
							name: cat,
							created: new Date().toISOString(),	
							defaultTax: '',	
							defaultIsAlcohol: false,
							isDisabled: false,
							items: {}
						};
						menu.categories[newCat.key] = newCat;
					});

					var catsArr = SV.toArray(menu.categories);
					result.items.forEach((item) => {
						var isAlcohol = item.type === 'Alcohol';

						var newItem = {
							key: SyncNode.guidShort(),
							name: item.name,
							//category: item.category,
							note: '',
							created: new Date().toISOString(),
							serveType: isAlcohol ? 'Bar' : 'Kitchen',
							description: '',
							price: item.price,
							tags: {},
							taxType: isAlcohol ? 'Included' : '9%',	
							isAlcohol: isAlcohol,
							isDisabled: item.isDisabled,
							options: {}
						};
						//menu.items[newItem.key] = newItem;

						var category;
						catsArr.forEach((cat) => {
							if(cat.name == item.category) category = cat;
						});	
						if(!category) console.log('Category not found: ', item.category); 
						else category.items[newItem.key] = newItem;
					});
					console.log('menu', menu);
					this.data.parent.remove('menu');
					this.data.parent.set('menu', menu);

				};
				r.readAsText(f);
			}}});

		SV.el('button', { parent: this.node, innerHTML: 'Edit Categories', className: 'btn',
			style: { float: 'right' },
			events: { click: () => { this.editMenuCategoriesModal.show(); }}});
		this.showDisabledButton = SV.el('button', { parent: this.node, className: 'btn',
			style: { float: 'right' },
			events: { click: () => { this.showDisabled = !this.showDisabled; this.render(); }}});
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
				width: 'calc(100% - 2.8em)'
			},
			events: {
				keyup: () => { this.render(); }
			}});
		SV.el('input', {
			parent: this.addView,
			value: 'Add',
			type: 'submit',
			style: {
				fontSize: '1.5em',
			}});

		this.menuCategoryView = this.appendView(new MenuCategoryView());
		this.menuCategoryView.on('menuItemSelected', (menuItem) => {
			this.editMenuItemModal.update(menuItem);
			this.editMenuItemModal.show();
		});

		this.menuListView = this.appendView(new MenuListView());
		this.menuListView.on('menuItemSelected', (menuItem) => {
			this.editMenuItemModal.update(menuItem);
			this.editMenuItemModal.show();
		});
	
		this.editMenuItemModal = new MenuItemEditModal();
		this.node.appendChild(this.editMenuItemModal.node);
		
		this.editMenuCategoriesModal = new MenuCategoriesEditModal();
		this.node.appendChild(this.editMenuCategoriesModal.node);

		this.showDisabled = true;
	}
	addItem() {
		var menuItem = {
			key: SyncNode.guidShort(),
			created: new Date().toISOString(),
			name: this.addInput.value,
			category: '',
			serveType: 'Kitchen',
			description: '',
			price: 0,
			tags: {}
		};
		this.addInput.value = '';
		var result = this.data.items.set(menuItem.key, menuItem)[menuItem.key];
		this.editMenuItemModal.update(result);
		this.editMenuItemModal.show();

	}	
	render() {
		if(!this.data.categories) this.data.set('categories', {});
		this.showDisabledButton.innerHTML = 'Disabled Items: ' + (this.showDisabled ? 'Shown' : 'Hidden');

		this.editMenuCategoriesModal.update(this.data.categories);

		var groupVals = SV.toArray(this.data.categories).map(cat => cat.name);
		groupVals.unshift('');

		var filtered;
		var filterText = this.addInput.value.trim().toLowerCase();
		if(filterText) {
			filtered = SV.filterMap(this.data.items,
					(m) => {
						return m.name.toLowerCase().indexOf(filterText) !== -1;
					});
		} else {
			filtered = this.data.items;
		}

		filtered = SV.toArray(filtered);
		filtered = filtered.filter(item => {
			if(this.showDisabled) return true;
			if(!item.isDisabled) return true;
			return false;
		});

		var groups = SV.group(filtered, 'category', groupVals);
		
		this.menuCategoryView.showDisabled = this.showDisabled;
		this.menuCategoryView.update(groups);

		this.menuListView.showDisabled = this.showDisabled;
		this.menuListView.update(groups);
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

class MenuCategoryView extends SyncView {
	constructor() {
		super();
		this.node.className = 'group';

		var categories = SV.el('div', { parent: this.node, 
			style: { width: '49%', display: 'inline-block', float: 'left' }});

		this.categoriesContainer = this.appendView(new ViewsContainer(MenuItemCategory, 'key'), categories);
		this.categoriesContainer.node.style.marginTop = '2em';
		this.categoriesContainer.on('viewAdded', (view) => {
			view.on('groupSelected', (group) => {
				this.selectedGroup = group;
				this.itemsContainer.update(this.selectedGroup);
			});
		});

		var items = SV.el('div', { parent: this.node, 
			style: { width: '49%', display: 'inline-block', float: 'left' }});

		this.itemsContainer = this.appendView(new ViewsContainer(MenuItem, 'key'), items);
		this.itemsContainer.node.style.marginTop = '2em';
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('menuItemSelected', (menuItem) => {
				this.emit('menuItemSelected', menuItem);
			});
		});
	}
	render() {
		this.categoriesContainer.update(this.data);
		this.itemsContainer.update(this.selectedGroup);
	}
}

class MenuItemCategory extends SyncView {
	constructor() {
		super();

		this.nameSpan = SV.el('div', { parent: this.node, className: 'btn btn-wide',
			style: { },
			events: { click: () => { this.emit('groupSelected', this.data); }}});	
	}
	render() {
		this.nameSpan.innerHTML = this.data.key;
	}
}



class MenuListView extends SyncView {
	constructor() {
		super();

		this.itemsContainer = new ViewsContainer(MenuItemGroup, 'key');
		this.itemsContainer.node.style.marginTop = '2em';
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('menuItemSelected', (menuItem) => {
				this.emit('menuItemSelected', menuItem);
			});
		});
		this.node.appendChild(this.itemsContainer.node);
	}
	render() {
		this.itemsContainer.update(this.data);
	}
}

class MenuItemGroup extends SyncView {
	constructor() {
		super();

		this.node.style.marginTop = '2em';
		this.nameSpan = SV.el('h3', { parent: this.node });
		
		this.itemsContainer = new ViewsContainer(MenuItem);
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (menuItem) => {
				this.emit('menuItemSelected', menuItem);
			});
		});
		this.node.appendChild(this.itemsContainer.node);
	}
	render() {
		this.nameSpan.innerHTML = this.data.key;
		this.itemsContainer.update(this.data);
	}
}


class MenuItem extends SyncView {
	constructor() {
		super();

		var btn = SV.el('div', { parent: this.node, className: 'btn btn-wide', 
			style: { backgroundColor: 'transparent' },
	       		events: { click: () => { this.emit('selected', this.data); }}});

		this.serveTypeImg = SV.el('img', { parent: btn, 
			style: { display: 'inline-block', width: '1em', marginRight: '0.5em' }});

		this.nameSpan = SV.el('span', { parent: btn, 
			style: { fontWeight: 'default' }});
		this.price = SV.el('span', { parent: btn, 
			style: { fontWeight: 'default', float: 'right' }});
	}
	render() {
		var src = '';
		switch(this.data.serveType) {
			case 'Kitchen':
				src = 'kitchen.png';
				break;
			case 'Bar':
				src = 'bar.png';
				break;
			default:
				src = '';
		}
		if(src !== '') {
			this.serveTypeImg.src = '/imgs/' + src;
		} else {
			this.serveTypeImg.src = '';
		}
		this.nameSpan.innerHTML = this.data.name;	
		this.price.innerHTML = SV.formatCurrency(this.data.price);
		this.node.style.backgroundColor = this.data.isDisabled ? '#DDD' : '#81C784';
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
		this.categorySelect = this.appendView(new SimpleEditSelect('category', 'Category'), this.mainView),

		this.views.push(this.categorySelect);
		this.views.push(this.appendView(new SimpleEditSelect('taxType', 'Tax Type', null, null, ['9%', 'Included']), this.mainView));
		this.views.push(this.appendView(new SimpleEditSelect('serveType', 'Serve Type', null, null, ['Kitchen', 'Bar', 'None']), this.mainView));
		this.views.push(this.appendView(new SimpleEditCheckBox('isDisabled', 'Disabled'), this.mainView));

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
		this.categorySelect.updateOptions(SV.toArray(this.data.parent.parent.categories).map(cat => cat.name));
		SyncView.updateViews(this.views, this.data);
	}
}



class MenuCategoriesEditModal extends Modal {
	constructor() {
		super();
		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Menu Categories' });


		this.addView = SV.el('form', {
			parent: this.mainView,
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
		


		this.itemsContainer = new ViewsContainer(MenuCategory);
		this.itemsContainer.node.style.marginTop = '2em';
		this.itemsContainer.on('viewAdded', (view) => {
			view.on('selected', (item) => {
				this.editMenuCategoryModal.update(item);
				this.editMenuCategoryModal.show();
			});
		});
		this.mainView.appendChild(this.itemsContainer.node);


		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });
		SV.el('button', { parent: footer, innerHTML: 'Ok', className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});

		this.editMenuCategoryModal = this.appendView(new MenuCategoryEditModal());
	}
	addItem() {
		var category = {
			key: SyncNode.guidShort(),
			name: this.addInput.value,
			created: new Date().toISOString(),
			defaultTax: '',
			defaultIsAlcohol: false,
			isDisabled: false
		};
		this.data.set(category.key, category);
	}
	render() {
		this.itemsContainer.update(this.data);
	}
}


class MenuCategory extends SyncView {
	constructor() {
		super();

		var btn = SV.el('div', { parent: this.node, className: 'btn btn-wide', 
	       		events: { click: () => { this.emit('selected', this.data); }}});

		this.nameSpan = SV.el('span', { parent: btn, 
			style: { }});
		this.defaultTax = SV.el('span', { parent: btn, 
			style: { float: 'right' }});
	}
	render() {
		this.nameSpan.innerHTML = this.data.name;	
		this.defaultTax.innerHTML = this.data.defaultTax;
	}
}


class MenuCategoryEditModal extends Modal {
	constructor() {
		super();
		SV.el('h1', { parent: this.mainView, innerHTML: 'Edit Menu Category' });
		this.views = [];
		this.views.push(this.appendView(new SimpleEditInput('name', 'Name'), this.mainView));
		this.views.push(this.appendView(new SimpleEditSelect('defaultTax', 'Default Tax', null, null, ['9%', 'Included']), this.mainView));

		var footer = SV.el('div', { parent: this.mainView, className: 'footer' });
		SV.el('button', { parent: footer, innerHTML: 'Ok', className: 'btn btn-big',
			style: { float: 'right' },
			events: { click: () => { this.hide(); }}});
		SV.el('button', { parent: footer, innerHTML: 'Delete', className: 'btn btn-big', 
			style: { float: 'left' },
			events: { click: () => { 
					Modal.confirm('Delete Menu Category', 'Delete this category?', () => {
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
