"use strict"



class Calendar extends SyncView {
	constructor() {
		super();
		this.sync = new SyncNodeSocket.SyncNodeSocket('/calendar', {});
		this.sync.onUpdated((data) => {
			console.log('updated', data);
			if(!data.weeks) data.set('weeks', {});
			else this.update(data);
		});

		this.mainView = SV.el('div', { parent: this.node});

		SV.el('h1', {
			parent: this.mainView,
			innerHTML: 'Calendar',
			className: 'light' });

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
	}
}



class Week extends SyncView {
	constructor() {
		super()

		this.header = SV.el('h4', {
			parent: this.node
		});
		this.daysContainer = new ViewsContainer(Day);
	       	this.node.appendChild(this.daysContainer.node);
	}
	render() {
		this.header.innerHTML = 'Week ' + moment(this.data.key).format('MM/DD');
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
		this.header.innerHTML = moment(this.data.key).format('MM/DD ddd');
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






SV.startReloader()

//var sv = new SV('/trivia')

var view = new Calendar()
SV.id('container').appendChild(view.node)

//sv.onupdated = () => {
	//if(!sv.db.notes){
	//	sv.db.set('notes', { members: {} });
	//} else {
	//	view.update(sv.db.notes);
	//}
//};

//sv.startSync();
