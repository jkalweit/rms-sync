"use strict"



class Timeclock extends SyncView {
	constructor() {
		super();

		document.body.style.paddingTop = '50px';
		el('button', { parent: this.node, innerHTML: 'Clock In',
			style: { position: 'fixed', top: '0px', left: '0px', width: '419px',
		       		fontSize: '3em' },
			events: { click: this.clockIn.bind(this) } });


		el('h1', { parent: this.node, innerHTML: 'Timeclock', className: 'light',
	       		style: { marginBottom: '0.2em', textAlign: 'center' }});
		this.mainView = el('div', { parent: this.node });
		this.dateRange = el('h4', { parent: this.mainView, className: 'light',
	       		style: { marginTop: '0.5em', marginBottom: '0.4em', textAlign: 'center'  }});

		var controls = el('div', { parent: this.mainView, style: { textAlign: 'center' } });
		this.backAWeek = el('a', { parent: controls, innerHTML: '<--',
	       		style: { width: '4em', display: 'inline-block' } });
		this.thisWeek = el('a', { parent: controls, href: '/clock',
			innerHTML: '[This Week]',
	       		style: { width: '9em', display: 'inline-block' } });
		this.forwardAWeek = el('a', { parent: controls,
			innerHTML: '-->',
	       		style: { width: '4em', display: 'inline-block' } });

		el('h2', { parent: this.mainView, className: 'light', innerHTML: 'By Day',
	       		style: { borderBottom: '1px solid #AAAAAA', marginTop: '1em', textAlign: 'center'  }});
		this.days = el('div', { parent: this.mainView });
		this.dayViews = {};



		el('h2', { parent: this.mainView, className: 'light', innerHTML: 'By Employee',
	       		style: { borderBottom: '1px solid #AAAAAA', marginTop: '2em', textAlign: 'center'  }});
		this.byEmployee = el('div', { parent: this.mainView });
		this.employeeViews = {};


		this.summary = el('div', { parent: this.mainView });
		el('h2', { parent: this.mainView, className: 'light', innerHTML: 'Summary',
	       		style: { borderBottom: '1px solid #AAAAAA', marginTop: '2em', textAlign: 'center'  }});
		this.summaryHours = el('div', { parent: this.mainView });



		this.clockinView = el('div', { parent: this.node,
	       		style: { display: 'none'  } });
		el('h1', { parent: this.clockinView, innerHTML: 'Clock In' });
		this.nameSelect = el('div', { parent: this.clockinView });

	//	this.manualClockIn = el('div', { parent: this.clockinView,
	//		style: { marginTop: '2em', borderTop: '1px solid #AAAAAA' }});
	//	this.nameInput = el('input', { parent: this.manualClockIn });
	//	el('button', { parent: this.manualClockIn, innerHTML: 'Clock In',
	//		events: { click: this.doManualClockIn.bind(this) }});

		el('button', { parent: this.clockinView, innerHTML: 'Cancel',
				style: { marginTop: '2em' },
				events: { click: () => {
					this.mainView.style.display = 'block';
					this.clockinView.style.display = 'none';
				} }});
	}
	clockIn() {
		this.mainView.style.display = 'none';
		this.clockinView.style.display = 'block';
	}
	doClockIn(employee) {
		this.mainView.style.display = 'block';
		this.clockinView.style.display = 'none';
		var timespan = {
			key: new Date().toISOString(),
			name: employee.name,
			clockIn: new Date().toISOString(),
			note: ''
		};
		this.data.timespans.set(timespan.key, timespan);
	}
	doManualClockIn() {
		var name = this.nameInput.value.trim();
		if(name === '') {
			alert('Name cannot be blank.');
			return;
		}
		var timespan = {
			key: new Date().toISOString(),
			name: name,
			clockIn: new Date().toISOString(),
			note: ''
		};
		this.data.timespans.set(timespan.key, timespan);
		this.mainView.style.display = 'block';
		this.clockinView.style.display = 'none';
	}
	render() {
		if(!this.data.timespans) { this.data.set('timespans', {}); return; };

		var date = SV.param('date');
	       	var mdate = date ? SV.getDayOfWeek(0, moment(date)) : SV.getDayOfWeek(0);
		var endDate = moment(mdate).add(1, 'weeks');

		this.dateRange.innerHTML = mdate.format('MM/DD/YYYY') + ' - '
			+ moment(endDate).subtract(1, 'days').format('MM/DD/YYYY');

		console.log('timespans', this.data.timespans);
		var filteredTimespans = SV.filterMap(this.data.timespans, (timespan) => {
			return moment(timespan.clockIn).isBetween(mdate, endDate);
		});

		console.log('filtered', filteredTimespans);

		var existingVal = this.nameSelect.value;
		this.nameSelect.innerHTML = '';
		var employeesArr = SV.toArray(this.data.employees, 'name');
		employeesArr.forEach((employee) => {
			if(employee.name === '[open]') return;
			el('button', { parent: this.nameSelect, innerHTML: employee.name,
				style: { fontSize: '1.5em', margin: '5px' },
				events: { click: () => { this.doClockIn(employee);  } } });
		});


		var timespansArr = SV.toArray(filteredTimespans);

		var employeeGroups = SV.group(timespansArr, 'name',
				employeesArr.filter(e => { return e.name !== '[open]'; })
					.map(e => { return e.name; }));

		this.summaryHours.innerHTML = '';
		Object.keys(employeeGroups).forEach(key => {
			if(Object.keys(employeeGroups[key]).length === 1) {
				delete employeeGroups[key];
			} else {
				var totalHours = 0;
				SV.toArray(employeeGroups[key]).forEach(timespan => {
					totalHours += Timespan.duration(timespan);
				});
				var div = el('div', { parent: this.summaryHours });
				el('span', { parent: div,
					innerHTML: key,
			       		style: { display: 'inline-block', width: '200px' }});
				el('span', { parent: div,
					innerHTML: totalHours.toFixed(2),
			       		style: { display: 'inline-block', width: '50px' }});
}
		});
		SV.updateViews(this.byEmployee, this.employeeViews, TimespanGroup,
				employeeGroups);



		var groups = SV.group(timespansArr,
				(timespan) => { return moment(timespan.clockIn).format('ddd'); },
				['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

		SV.updateViews(this.days, this.dayViews, TimespanGroup,
				groups);

		var sunday = SV.getDayOfWeek(0, mdate);
		this.backAWeek.href = '/clock?date=' + moment(sunday).subtract(1, 'week').format('YYYY-MM-DD');
		this.forwardAWeek.href = '/clock?date=' + moment(sunday).add(1, 'week').format('YYYY-MM-DD');

	}
}


class TimespanGroup extends SyncView {
	constructor() {
		super();
		this.header = el('h3', { parent: this.node, className: 'light',
			style: { textAlign: 'center' }});
		this.timespans = el('div', { parent: this.node });
		this.timespanViews = {};
	}
	render() {
		this.header.innerHTML = this.data.key;
		SV.updateViews(this.timespans, this.timespanViews, Timespan,
				this.data);
	}
}

class Timespan extends SyncView {
	constructor() {
		super();
	        this.node.style.marginTop = '5px';
		this.header = el('div', { parent: this.node,
	       		style: { display: 'inline-block', width: '120px' }});
		this.clockText = el('div', { parent: this.node,
	       		style: { display: 'inline-block', width: '180px' }});
		this.clockOutButton = el('button', { parent: this.node, innerHTML: 'Clock Out',
			events: { click: this.clockOut.bind(this) } });
		this.duration = el('div', { parent: this.node,
	       		style: { display: 'inline-block' }});
		this.editButton = el('button', { parent: this.node, innerHTML: 'i',
			style: { float: 'right' },
			events: { click: () => {
				this.isEditing = !this.isEditing; this.render();
			} }});
		this.noteButton = el('button', { parent: this.node, innerHTML: 'n',
			style: { float: 'right' },
			events: { click: () => {
				this.showNote = !this.showNote; this.render();
			       this.editNote.focus();
			} }});

		this.editNote = el('input', { parent: this.node,
			events: { blur: () => {
				this.data.set('note', this.editNote.value);
				//this.showNote = false;
				this.render();
			}}});


		this.editView = el('div', { parent: this.node,
	       		style: { marginTop: '1em' }});
		el('button', { parent: this.editView, innerHTML: 'X',
			style: { float: 'right' },
			events: { click: () => {
				if(confirm('Delete?')) this.data.parent.remove(this.data.key);
			} }});
		this.editClockIn = el('input', { parent: this.editView,
			events: { blur: () => {
				var clockIn = moment(this.editClockIn.value, this.editFormat);
				this.data.set('clockIn', clockIn.toJSON()); }}});
		this.editClockOut = el('input', { parent: this.editView,
			events: { blur: () => {
				if(this.editClockOut.value.trim() === '') this.data.remove('clockOut');
				else {
					var clockOut = moment(this.editClockOut.value, this.editFormat);
					this.data.set('clockOut', clockOut.toJSON());
				}
			}}});
		this.editName = el('input', { parent: this.editView,
			events: { blur: () => {
				this.data.set('name', this.editName.value); }}});



		document.addEventListener('keypress', e => {
			if(e.keyCode === 94) { // 94 = '^'
				this.adminMode = !this.adminMode;
				this.render();
			}
		});

		this.editFormat = 'MM/DD/YYYY hh:mma';
	}
	clockOut() {
		this.data.set('clockOut', new Date().toISOString());
	}
	static duration(timespan) {
		if(!timespan.clockOut) return 0;
		var dur = moment.duration(moment(timespan.clockOut).diff(moment(timespan.clockIn)));
		return Math.round(dur.asHours() * 100) / 100;
	}
	render() {
		this.editButton.style.display = this.adminMode ? 'initial' : 'none';
		this.editNote.value = this.data.note;
		this.editNote.style.display = this.showNote ? 'initial' : 'none';
		this.noteButton.style.backgroundColor = this.data.note ? '#AAFFAA' : 'initial';

		this.header.innerHTML = this.data.name;
		this.editClockIn.value = moment(this.data.clockIn).format(this.editFormat);
		this.editClockOut.value = this.data.clockOut ? moment(this.data.clockOut).format(this.editFormat) : '';
		this.editName.value = this.data.name;

		var clockIn = moment(this.data.clockIn);
		var text = clockIn.format('ddd hh:mma') + ' - ';
		if(this.data.clockOut) {
			var clockOut = moment(this.data.clockOut);
			text += clockOut.format('hh:mma');
			this.duration.innerHTML = Timespan.duration(this.data).toFixed(2);
		} else {
			this.duration.innerHTML = '';
		}

		this.clockOutButton.style.display = this.data.clockOut ? 'none' : 'inline';
		this.clockText.innerHTML = text;
		this.editView.style.display = this.isEditing ? 'block' : 'none';
	}
}



SV.startReloader();

var el = SV.el;

var t = new Timeclock();
SV.id('container').appendChild(t.node);

var sv = new SV();
sv.onupdated = () => {
	console.log('update!');
	t.update(sv.db.shifts);
};

sv.startSync();
