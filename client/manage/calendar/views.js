"use strict"


class TopMenu {
	constructor(title) {
		this.node = SV.el('div', {
			className: 'group',
			style: { position: 'fixed', 
				margin: 0, padding: 0,
				left: 0, top: 0, 
				width: '100%',
				height: '3em',
				borderTop: '1px solid #555',
				backgroundColor: '#777' }
		});

		SV.el('button', {
			parent: this.node,
			innerHTML: 'Back',
			events: { click: () => { window.history.back() }},
			style: { width: '25%', height: '100%', float: 'left' }
		});
		SV.el('div', {
			parent: this.node,
			innerHTML: title,
			style: { width: '50%', height: '100%', paddingTop: '0.7em', fontSize: '20px',
				textAlign: 'center', color: '#FFF', float: 'left' }
		});
		SV.el('button', {
			parent: this.node,
			innerHTML: 'Home',
			style: { width: '25%', height: '100%', float: 'left' }
		});
	}
}

class BottomMenu {
	constructor() {
		this.node = SV.el('div', {
			style: { position: 'fixed', 
				margin: 0, padding: 0,
				left: 0, bottom: 0, 
				width: '100%',
				height: '3em',
				borderTop: '1px solid #555',
				backgroundColor: '#777' }
		});

		SV.el('button', {
			parent: this.node,
			innerHTML: 'Back',
			style: { width: '50%', height: '100%', borderRight: '1px solid #555' }
		});
	}
}


class Calendar extends SyncView {
	constructor() {
		super();
		this.sync = new SyncNodeSocket.SyncNodeSocket('/calendar', {});
		this.sync.onUpdated((data) => {
			console.log('updated', data);
			if(!data.weeks) data.set('weeks', {});
			else this.update(data);
		});

		SV.el('h1', {
			parent: this.node,
			className: 'light',
			innerHTML: 'Calendar' });

		// this.topMenu = new TopMenu('Calendar');
		// this.node.appendChild(this.topMenu.node);


		// SV.el('button', {
		//	parent: this.mainView,
		//	innerHTML: 'Do Test',
		//	events: {
		//		click: () => {
		//			this.addWeeks('2016-01-03', 52);
		//		}
		//	}});

		this.weeksContainer = new ViewsContainer(Week);
	       	this.node.appendChild(this.weeksContainer.node);
	}
	addWeeks(startDate, numWeeks) {
		var mstart = moment(startDate);		
		for(var i = 0; i < numWeeks; i++) {
			var week = {
				key: mstart.format('YYYY-MM-DD'),
				days: {}
			}
			for(var j = 0; j < 7; j++) {
				var day = {
					key: moment(mstart).add('days', j).format('YYYY-MM-DD'),
					items: {}
				};		
				week.days[day.key] = day;
			}
			this.data.weeks.set(week.key, week);
			mstart.add('weeks', 1);
		}
	}
	render() {
		this.weeksContainer.update(this.data.weeks);
		if(!this.hasRunOnce) {
			console.log('location', window.location);
			var day = window.location.hash.replace('#', '').trim();
			day = (day !== '') ? moment(day) : moment();
			window.location.hash = '#' + SV.getDayOfWeek(0, day).format('YYYY-MM-DD'); 
			this.hasRunOnce = true;
		}		
	}
}



class Week extends SyncView {
	constructor() {
		super()

		this.header = SV.el('h3', {
			className: 'light',
			parent: this.node
		});
		this.daysContainer = new ViewsContainer(Day);
		this.daysContainer.node.style.marginLeft = '1em';
	       	this.node.appendChild(this.daysContainer.node);
	}
	render() {
		this.header.innerHTML = 'Week ' + moment(this.data.key).format('M/DD');
		this.header.id = this.data.key;
		this.daysContainer.update(this.data.days);
	}
}



class Day extends SyncView {
	constructor() {
		super()
		
		this.header = SV.el('h4', {
			parent: this.node,
			innerHTML: 'Day',
			events: { click: () => { this.isEditing = !this.isEditing; this.render(); this.itemInput.focus(); }}
		});

		this.editView = SV.el('form', {
			parent: this.node,
			events: { submit: (e) => { this.addItem(); e.preventDefault(); }}
		});
		this.itemInput = SV.el('input', {
			parent: this.editView
		});
		SV.el('input', {
			parent: this.editView,
			type: 'submit',
			innerHTML: 'Add Item'
		});

		this.isEditing = false;

		this.itemsContainer = new ViewsContainer(CalendarItem);
		this.itemsContainer.node.style.marginLeft = '1em';
		this.node.appendChild(this.itemsContainer.node);
	}
	addItem() {
		var e = {
			key: new Date().toISOString(),
			name: this.itemInput.value.trim()
		};
		this.itemInput.value = '';
		this.isEditing = false;
		this.data.items.set(e.key, e);
		SV.sendToAdmin('Event added: ' + this.data.key + ' ' + e.name);
	}
	render() {
		this.header.innerHTML = moment(this.data.key).format('ddd M/DD');
		this.header.id = this.data.key;
		this.editView.style.display = this.isEditing ? 'block' : 'none';
		this.itemsContainer.update(this.data.items);
	}
}



class CalendarItem extends SyncView {
	constructor() {
		super();

		this.mainView = SV.el('div', { parent: this.node });

		this.header = SV.el('p', {
			parent: this.mainView,
			events: { click: () => { this.isEditing = !this.isEditing; this.render(); this.textInput.focus(); }}
		});

		this.editView = SV.el('div', {
			parent: this.node
		});

		this.textInput = new SimpleEditInput('name'); 
		this.textInput.on('changed', (value, oldValue) => { 
			SV.sendToAdmin('Event changed: ' + this.data.parent.parent.key + ' ' + value); }); 
		this.editView.appendChild(this.textInput.node);
		SV.el('button', {
			parent: this.editView,
			innerHTML: 'Ok',
			events: { click: () => { this.isEditing = false; this.render(); }}
		});
		SV.el('button', {
			parent: this.editView,
			innerHTML: 'X',
			events: { click: () => { 
				if(confirm('Delete item?')) {
					this.data.parent.remove(this.data.key); 
					SV.sendToAdmin('Event deleted: ' + this.data.parent.parent.key + ' ' + this.data.name);
				}
			}}
		});

		this.isEditing = false
	}
	render() {
		this.header.innerHTML = this.data.name; 
		this.mainView.style.display = !this.isEditing ? 'block' : 'none';
		this.editView.style.display = this.isEditing ? 'block' : 'none';
		this.textInput.update(this.data);
	}
}






SV.startReloader();


var view = new Calendar();
SV.id('container').appendChild(view.node);

