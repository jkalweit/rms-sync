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
		this.node.className = 'text-selectable';

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
				var div = SV.el('div', { parent: this.node });
				SV.el('span', { parent: div,
					innerHTML: key,
			       		style: { display: 'inline-block', width: '150px' }});
				SV.el('span', { parent: div,
					innerHTML: totalHours.toFixed(2),
			       		style: { display: 'inline-block', width: '75px' }});
				SV.el('span', { parent: div,
					innerHTML: 'Tips:',
			       		style: { display: 'inline-block', width: '50px' }});
				SV.el('span', { parent: div,
					innerHTML: totalTips.toFixed(2),
			       		style: { display: 'inline-block', width: '50px' }});
		});}
}

class TimeclockNotificationsModal extends Modal {
	constructor() {
		super();

		console.log('here');	
		SV.el('h2', { parent: this.mainView, innerHTML: 'Notifications' });
		var table = SV.el('table', { parent: this.mainView });
		this.notificationsContainer = new ViewsContainer(UserNotification, 'key', 'reverse', table);
		this.notificationsContainer.on('viewAdded', (view) => {
			view.on('updating', () => { view.employee = this.employee; });
			view.on('acknowledge', () => {
				var ack = {
					key: this.employee.name,
					timestamp: new Date().toISOString()
				};
				view.data.acknowledgements.set(ack.key, ack);
				SV.sendToAdmin(this.employee.name + ' acknowledged: ' + view.data.text);
			});
		});
		this.mainView.appendChild(this.notificationsContainer.node);
		SV.el('button', { parent: this.mainView, innerHTML: 'Ok',
			style: { marginTop: '1em' },
			events: { click: () => { this.hide(); }}});
	}
	render() {
		this.notificationsContainer.update(this.data.notifications, true);
	}
}

class UserNotification extends SyncView {
	constructor() {
		super(SV.el('tr'));

		var cell = SV.el('td', { parent: this.node,
			style: { width: '175px' }});
		this.timestamp = SV.el('span', { parent: cell });
		cell = SV.el('td', { parent: this.node,
			style: { width: '120px' }});
		this.status = SV.el('span', { parent: cell });
		this.acceptButton = SV.el('button', { parent: cell, innerHTML: 'Acknowledge',
			events: { click: () => { 
				this.emit('acknowledge');
			}}});
		cell = SV.el('td', { parent: this.node });
		this.text = SV.el('span', { parent: cell });
	}
	render() {
		this.timestamp.innerHTML = moment(this.data.key).format('dddd M/D/YYYY')
		if(this.employee) {
			var ack = this.data.acknowledgements[this.employee.name];
			if(!ack) {
				this.status.style.display = 'none';
				this.acceptButton.style.display = 'initial';
			} else {
				this.status.style.display = 'initial';
				this.status.innerHTML = moment(ack.timestamp).format('M/D/YYYY');
				this.acceptButton.style.display = 'none';
			}
		}
		this.text.innerHTML = this.data.text;
	}
}

class Timeclock extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/data', {});
		this.sync.on('updated', (data) => {
			if(!data.shifts) { 
				data.set('shifts', {});
			}
			else if(!data.shifts.timespans) { 
				data.shifts.set('timespans', {});
			}
			else { 
				this.update(data);
			}
		});


		this.notificationsModal = new TimeclockNotificationsModal();
		this.node.appendChild(this.notificationsModal.node);

		SV.el('button', { parent: this.node, innerHTML: 'Clock In',
			style: { fontSize: '3em', display: 'block', margin: 'auto' },
			events: { click: this.clockIn.bind(this) } });


		SV.el('h1', { parent: this.node, innerHTML: 'Timeclock', className: 'light',
	       		style: { marginBottom: '0.2em', textAlign: 'center' }});
		this.mainView = SV.el('div', { parent: this.node });
		this.dateRange = SV.el('h4', { parent: this.mainView, className: 'light',
	       		style: { marginTop: '0.5em', marginBottom: '0.4em', textAlign: 'center'  }});

		var controls = SV.el('div', { parent: this.mainView, style: { textAlign: 'center' } });
		this.backAWeek = SV.el('a', { parent: controls, innerHTML: '<--',
	       		style: { width: '4em', display: 'inline-block' } });
		this.thisWeek = SV.el('a', { parent: controls, href: '/clock',
			innerHTML: '[This Week]',
	       		style: { width: '9em', display: 'inline-block' } });
		this.forwardAWeek = SV.el('a', { parent: controls,
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





		this.clockinView = SV.el('div', { parent: this.node,
	       		style: { display: 'none'  } });
		SV.el('h1', { parent: this.clockinView, innerHTML: 'Clock In' });
		this.nameSelect = SV.el('div', { parent: this.clockinView });


		SV.el('button', { parent: this.clockinView, innerHTML: 'Cancel',
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
		this.notificationsModal.employee = employee;
		this.notificationsModal.update(this.data, true);
		this.notificationsModal.show();
		
		this.mainView.style.display = 'block';
		this.clockinView.style.display = 'none';
		var timespan = {
			key: new Date().toISOString(),
			name: employee.name,
			clockIn: new Date().toISOString(),
			note: ''
		};
		this.data.shifts.timespans.set(timespan.key, timespan);
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
		this.data.shifts.timespans.set(timespan.key, timespan);
		this.mainView.style.display = 'block';
		this.clockinView.style.display = 'none';
	}
	render() {
		document.body.style.paddingTop = '50px';

		var date = SV.param('date');
	       	var mdate = date ? SV.getDayOfWeek(0, moment(date)) : SV.getDayOfWeek(0);
		var endDate = moment(mdate).add(1, 'weeks');

		this.dateRange.innerHTML = mdate.format('MM/DD/YYYY') + ' - '
			+ moment(endDate).subtract(1, 'days').format('MM/DD/YYYY');

		var filteredTimespans = SV.filterMap(this.data.shifts.timespans, (timespan) => {
			return moment(timespan.clockIn).isBetween(mdate, endDate);
		});


		var existingVal = this.nameSelect.value;
		this.nameSelect.innerHTML = '';
		var employeesArr = SV.toArray(this.data.shifts.employees, 'name');
		employeesArr.forEach((employee) => {
			if(employee.name === '[open]') return;
			SV.el('button', { parent: this.nameSelect, innerHTML: employee.name,
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

		this.notificationsModal.update(this.data);
	}
}


class TimespanGroup extends SyncView {
	constructor() {
		super();
		this.header = SV.el('h3', { parent: this.node, className: 'light',
			style: { textAlign: 'center' }});
		this.timespans = SV.el('div', { parent: this.node });
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
		this.header = SV.el('div', { parent: mainView,
	       		style: { display: 'inline-block', width: '120px' }});
		this.clockText = SV.el('div', { parent: mainView,
	       		style: { display: 'inline-block', width: '180px' }});
		this.clockOutButton = SV.el('button', { parent: mainView, innerHTML: 'Clock Out',
			events: { click: () => { this.clockoutModal.show(); }}});
		this.duration = SV.el('div', { parent: mainView,
	       		style: { display: 'inline-block' }});
		this.editButton = SV.el('button', { parent: mainView, innerHTML: 'i',
			style: { float: 'right' },
			events: { click: () => {
				this.isEditing = !this.isEditing; this.render();
			} }});
		this.noteButton = SV.el('button', { parent: mainView, innerHTML: 'n',
			style: { float: 'right' },
			events: { click: () => {
				this.showNote = !this.showNote; this.render();
			       this.editNote.focus();
			} }});

		this.editNote = new SimpleEditInput('note', 'Note');
		this.node.appendChild(this.editNote.node);
		

		this.editView = SV.el('div', { parent: this.node,
			className: 'group',
	       		style: { marginTop: '1em' }});
		SV.el('button', { parent: this.editView, innerHTML: 'X',
			style: { float: 'right' },
			events: { click: () => {
				if(confirm('Delete?')) this.data.parent.remove(this.data.key);
			} }});
		this.editClockIn = SV.el('input', { parent: this.editView,
			events: { blur: () => {
				var clockIn = moment(this.editClockIn.value, this.editFormat);
				this.data.set('clockIn', clockIn.toJSON()); }}});
		this.editClockOut = SV.el('input', { parent: this.editView,
			events: { blur: () => {
				if(this.editClockOut.value.trim() === '') this.data.remove('clockOut');
				else {
					var clockOut = moment(this.editClockOut.value, this.editFormat);
					this.data.set('clockOut', clockOut.toJSON());
				}
			}}});
		this.editName = SV.el('input', { parent: this.editView,
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

var t = new Timeclock();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
