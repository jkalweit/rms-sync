"use strict"

class Member extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/memberdata', {});
		this.sync.onUpdated((data) => {
			this.update(data);
		});

		this.userinfo = new UserInfo();
		this.node.appendChild(this.userinfo.node);

		this.node.className = 'group';

		this.points = SV.el('h2', { parent: this.node, className: 'light' });
		this.pointsView = new PointsView();
		this.node.appendChild(this.pointsView.node);
	}
	render() {
		this.node.style.backgroundColor = this.editMode ? '#EEE' : 'transparent';

		var member = this.data;
		this.userinfo.update(member.info);
		if(member.loyalty) {
			this.points.innerHTML = 'Points: ' + (member.loyalty.points | 0);
			this.pointsView.update(member.loyalty.pointsHistory);
		}
	}
}
class PointsView extends SyncView {
	constructor() {
		super();

		this.pointsContainer = new ViewsContainer(Points, 'key', 'reverse');
		this.pointsContainer.node.style.marginTop = '1em';
		this.node.appendChild(this.pointsContainer.node);
	}
	render() {
		this.pointsContainer.update(this.data);
	}
}


class Points extends SyncView {
	constructor() {
		super();
		this.dateSpan = SV.el('span', { parent: this.node,
			style: { display: 'inline-block', width: '50%' }});
		this.typeSpan = SV.el('span', { parent: this.node,
			style: { display: 'inline-block', width: '25%' }});
		this.amountSpan = SV.el('span', { parent: this.node,
			style: { display: 'inline-block', width: '25%', textAlign: 'right' }});
	}
	render() {
		this.dateSpan.innerHTML = moment(this.data.key).format('ddd MMM Do YYYY, h:mma');
		this.typeSpan.innerHTML = this.data.type;
		this.amountSpan.innerHTML = this.data.amount;
		this.amountSpan.style.color = this.data.type === 'Redeem' ? '#44DD44' : 'initial';
	}
}



SV.startReloader();

var t = new Member();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

if(location.hash = '#_=_') history.replaceState({}, document.title, '.');;
