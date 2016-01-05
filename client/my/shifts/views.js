"use strict"

class ShiftManagement extends SyncView {
	constructor() {
		super();
		el('h1', { parent: this.node, className: 'light', innerHTML: 'Shifts'});
//		this.dateInput = el('input', { parent: this.node, type: 'date', 
//			valueAsDate: new Date(),
//	       		events: { change: () => { this.render(); } }	});
		this.backAWeek = el('a', { parent: this.node, innerHTML: 'Back a Week',
	       		style: { display: 'block' } });
		this.thisWeek = el('a', { parent: this.node, href: '/shifts', 
			innerHTML: 'This Week',
	       		style: { display: 'block' } });
		this.forwardAWeek = el('a', { parent: this.node, 
			innerHTML: 'Forward a Week',
	       		style: { display: 'block' } });
		this.shiftSelect = el('div', { parent: this.node });
		this.positionSelect = el('select', { parent: this.shiftSelect });
		el('option', { parent: this.positionSelect, innerHTML: 'Kitchen' });
		el('option', { parent: this.positionSelect, innerHTML: 'Server' });
		el('option', { parent: this.positionSelect, innerHTML: 'Bartender' });
		el('option', { parent: this.positionSelect, innerHTML: 'Float'});
		this.nameSelect = el('select', { parent: this.shiftSelect });
		this.dragHandle = el('div', { parent: this.shiftSelect, draggable: true,
			style: { width: '20px', height: '20px', 
				backgroundColor: '#555555', display: 'inline-block' },
			events: { dragstart: this.dragShift.bind(this) } });
		// el('button', { parent: this.node, innerHTML: 'Reset', 
		//	events: { click: () => { this.data.remove('weeks');  } } });
		this.shiftWeek = new ShiftWeek();
		this.node.appendChild(this.shiftWeek.node);
	}
	dragShift(ev) {
		var shiftData = {
			position: this.positionSelect.value,
			name: this.nameSelect.value
		};
		ev.dataTransfer.setData('text', JSON.stringify(shiftData));
	}
	render() {
		var date = param('date');
	       	var mdate = date ? moment(date) : moment();
		var existingVal = this.nameSelect.value;
		this.nameSelect.innerHTML = '';
		toArray(this.data.employees, 'name').forEach((employee) => {
			el('option', { parent: this.nameSelect, innerHTML: employee.name });
		});
		this.nameSelect.value = existingVal;
		var sunday = ShiftWeek.getDayOfWeek(0, mdate);
		this.backAWeek.href = '/shifts?date=' + moment(sunday).subtract(1, 'week').format('YYYY-MM-DD');	
		this.forwardAWeek.href = '/shifts?date=' + moment(sunday).add(1, 'week').format('YYYY-MM-DD');	
		this.shiftWeek.update({ mdate: sunday, shifts: this.data });
	}
}

class ShiftWeek extends SyncView {
	constructor() {
		super();
		this.days = el('div', { parent: this.node });		
		this.dayViews = {};
	}
	addShift() {
		var employee = { key: new Date().toISOString(), name: this.newInput.value };
		this.data.employees.set(employee.key, employee);
	}
	render() {
		var dateKey = ShiftWeek.makeDateKey(this.data.mdate);
		if(!this.data.shifts.weeks) {
			this.data.shifts.set('weeks', {});
		} else if(!this.data.shifts.weeks[dateKey]) {
			var week = { key: dateKey, days: {} };
			for(var i = 0; i < 7; i++) {
				var dayDateKey = ShiftWeek.makeDateKey(ShiftWeek.getDayOfWeek(i, this.data.mdate));
				var day = { key: dayDateKey, shifts: {} };
				week.days[day.key] = day;
			}
			this.data.shifts.weeks.set(dateKey, week); 
		} else {
			updateViews(this.days, this.dayViews, ShiftDay, this.data.shifts.weeks[dateKey].days);  
		}
	}
	static getDayOfWeek(day, mdate) {
		mdate = mdate || moment();
		var sunday = mdate.startOf('day').subtract(mdate.day(), 'day');
		return sunday.add(day, 'day');
	}
	static makeDateKey(mdate) {
		return mdate.format('YYYY-MM-DD');
	}
}

class ShiftDay extends SyncView {
	constructor() {
		super(el('div', {
			events: {
				dragover: (ev) => { ev.preventDefault(); },
				drop: (ev) => { 
					this.addShift(JSON.parse(ev.dataTransfer.getData('text')));
				}
			}
		}));
		this.header = el('h5', { parent: this.node });
		this.shifts = el('div', { parent: this.node });
		this.shiftViews = {};
	}
	addShift(dropData) {
		console.log('addShift', dropData);
		var shift = {
			key: new Date().toISOString(),
			position: dropData.position,
			name: dropData.name,
			isConfirmed: false
		};
		this.data.shifts.set(shift.key, shift);
	}
	render() {
		this.mdate = moment(this.data.key);
		this.header.innerHTML = this.mdate.format('ddd MMM Do');
		updateViews(this.shifts, this.shiftViews, Shift, this.data.shifts, toArray(this.data.shifts, 'position'));
	}
}

class Shift extends SyncView {
	constructor() {
		super();		
		this.name = el('span', { parent: this.node, 
	       		style: { width: '40%', float: 'left'  } });
		this.position = el('span', { parent: this.node,
	       		style: { width: '40%', float: 'left' } });
		el('button', { parent: this.node, innerHTML: 'X',
			events: { click: () => { this.data.parent.remove(this.data.key);  } } });
	}
	render() {
		var color;
		switch(this.data.position) {
			case 'Kitchen':
				color = '#AAFFAA';
				break;
			case 'Server':
				color = '#AAAAFF';
				break;
			case 'Bartender':
				color = '#AAFFFF';
				break;
			case 'Float':
				color = '#FFFFAA';
				break;
			default:
				color = '#FFAAAA';
				break;
		}
		this.node.style.backgroundColor = color;
		this.name.innerHTML = this.data.name;
		this.position.innerHTML = this.data.position;
	}
}

var t = new ShiftManagement();
id('container').appendChild(t.node);

var onupdated = () => {
	console.log('update!', this.db);
	t.update(this.db.shifts); 
};


