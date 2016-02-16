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


class LoginOrSignup extends SyncView {
	constructor() {
		super();

		SV.el('h1', { parent: this.node, innerHTML: 'Login' });


		this.tabs = new TabView();
		this.tabs.node.style.marginTop = '2em';
		this.node.appendChild(this.tabs.node);


		// this.tabByDay = new TimeclockByDay();
		// this.tabs.addTab(this.tabByDay);
		// this.tabs.showTab(this.tabByDay);
		// 		
		// this.tabByEmployee = new TimeclockByEmployee();
		// this.tabs.addTab(this.tabByEmployee);

	}
	render() {
	}
}


SV.startReloader();

var t = new LoginOrSignup();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });
