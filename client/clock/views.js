"use strict"

class TimeclockByDay extends Tab {
	constructor() {
		super();

		this.title = 'By Day';

		this.views = new ViewsContainer(TimespanGroup);
		this.node.appendChild(this.views.node);
	}
	render() {
		this.views.update(this.data);
	}
}

class TimeclockByEmployee extends Tab {
	constructor() {
		super();

		this.title = 'By Employee';

		this.views = new ViewsContainer(TimespanGroup);
		this.node.appendChild(this.views.node);
	}
	render() {
		this.views.update(this.data);
	}
}

class TimeclockSummary extends Tab {
	constructor() {
		super();

		this.title = 'Summary';
	}
	render() {
		this.node.innerHTML = '';
		Object.keys(this.data).forEach(key => {
				var totalHours = 0.0;
				var totalTips = 0.0;
				SV.toArray(this.data[key]).forEach(timespan => {
					totalHours += Timespan.duration(timespan);
					if( timespan.tips) totalTips += +timespan.tips;
				});
				var div = el('div', { parent: this.node });
				el('span', { parent: div,
					innerHTML: key,
			       		style: { display: 'inline-block', width: '150px' }});
				el('span', { parent: div,
					innerHTML: totalHours.toFixed(2),
			       		style: { display: 'inline-block', width: '75px' }});
				el('span', { parent: div,
					innerHTML: 'Tips:',
			       		style: { display: 'inline-block', width: '50px' }});
				el('span', { parent: div,
					innerHTML: totalTips.toFixed(2),
			       		style: { display: 'inline-block', width: '50px' }});
		});}
}

class Timeclock extends SyncView {
	constructor() {
		super();

		document.body.style.paddingTop = '50px';
		el('button', { parent: this.node, innerHTML: 'Clock In',
			style: { fontSize: '3em', display: 'block', margin: 'auto' },
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



		this.tabs = new TabView();
		this.tabs.node.style.marginTop = '2em';
		this.mainView.appendChild(this.tabs.node);


		this.tabByDay = new TimeclockByDay();
		this.tabs.addTab(this.tabByDay);
		this.tabs.showTab(this.tabByDay);
				
		this.tabByEmployee = new TimeclockByEmployee();
		this.tabs.addTab(this.tabByEmployee);

		this.tabSummary = new TimeclockSummary();
		this.tabs.addTab(this.tabSummary);





		this.clockinView = el('div', { parent: this.node,
	       		style: { display: 'none'  } });
		el('h1', { parent: this.clockinView, innerHTML: 'Clock In' });
		this.nameSelect = el('div', { parent: this.clockinView });


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

		var filteredTimespans = SV.filterMap(this.data.timespans, (timespan) => {
			return moment(timespan.clockIn).isBetween(mdate, endDate);
		});


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

		Object.keys(employeeGroups).forEach(key => {
			if(Object.keys(employeeGroups[key]).length === 1) {
				delete employeeGroups[key];
			}
		});

		this.tabByEmployee.update(employeeGroups);
		this.tabSummary.update(employeeGroups);

		var groups = SV.group(timespansArr,
				(timespan) => { return moment(timespan.clockIn).format('ddd'); },
				['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

		this.tabByDay.update(groups);		

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

		this.clockoutModal = new Modal();
		var modalView = this.clockoutModal.mainView;
		SV.el('h1', { parent: modalView, innerHTML: 'Tips?' });
		this.tipsInputModal = SV.el('input', { parent: modalView });
		this.tipsInputModal.style.display = 'block';
		this.tipsInputModal.style.marginBottom = '10px';
		SV.el('button', { parent: modalView, innerHTML: 'Clock Out',
			className: 'btn-big',
			events: { click: () => {				
				if(this.clockOut()) {
					this.clockoutModal.hide();
				}
			}}});
		SV.el('button', { parent: modalView, innerHTML: 'Cancel',
			className: 'btn-big',
			events: { click: () => { this.clockoutModal.hide(); }}});
		this.node.appendChild(this.clockoutModal.node);

	        this.node.style.marginTop = '5px';
	
		var mainView = SV.el('div', { parent: this.node, className: 'group' });
		this.header = el('div', { parent: mainView,
	       		style: { display: 'inline-block', width: '120px' }});
		this.clockText = el('div', { parent: mainView,
	       		style: { display: 'inline-block', width: '180px' }});
		this.clockOutButton = el('button', { parent: mainView, innerHTML: 'Clock Out',
			events: { click: () => { this.clockoutModal.show(); }}});
		this.duration = el('div', { parent: mainView,
	       		style: { display: 'inline-block' }});
		this.editButton = el('button', { parent: mainView, innerHTML: 'i',
			style: { float: 'right' },
			events: { click: () => {
				this.isEditing = !this.isEditing; this.render();
			} }});
		this.noteButton = el('button', { parent: mainView, innerHTML: 'n',
			style: { float: 'right' },
			events: { click: () => {
				this.showNote = !this.showNote; this.render();
			       this.editNote.focus();
			} }});

		this.editNote = new SimpleEditInput('note', 'Note');
		this.node.appendChild(this.editNote.node);
		

		this.editView = el('div', { parent: this.node,
			className: 'group',
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
		this.editTips = new SimpleEditInput('tips', 'Tips');
		this.editView.appendChild(this.editTips.node);



		document.addEventListener('keypress', e => {
			if(e.keyCode === 94) { // 94 = '^'
				this.adminMode = !this.adminMode;
				this.render();
			}
		});

		this.editFormat = 'MM/DD/YYYY hh:mma';
	}
	clockOut() {
		var tips = this.tipsInputModal.value.trim().replace('$', '');
		if(tips === '') tips = '0';
		var tipsParsed = parseFloat(tips);
		if(isNaN(tipsParsed)) {
			alert('Invalid tip amount, please enter a number');
			return false;
		}
		this.data.set('tips', tipsParsed);		
		this.data.set('clockOut', new Date().toISOString());
		return true;
	}
	static duration(timespan) {
		if(!timespan.clockOut) return 0;
		var dur = moment.duration(moment(timespan.clockOut).diff(moment(timespan.clockIn)));
		return Math.round(dur.asHours() * 100) / 100;
	}
	render() {
		this.tipsInputModal.value = this.data.tips || 0;
		this.editButton.style.display = this.adminMode ? 'initial' : 'none';
		this.editNote.update(this.data);
		this.editNote.node.style.display = this.showNote ? 'initial' : 'none';
		this.noteButton.style.backgroundColor = this.data.note ? '#AAFFAA' : 'initial';

		this.header.innerHTML = this.data.name;
		this.editClockIn.value = moment(this.data.clockIn).format(this.editFormat);
		this.editClockOut.value = this.data.clockOut ? moment(this.data.clockOut).format(this.editFormat) : '';
		this.editName.value = this.data.name;
		this.editTips.update(this.data);

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
