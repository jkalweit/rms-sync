"use strict"

class Member extends SyncView {
	constructor() {
		super();

		this.sync = new SyncNodeSocket('/memberdata', {});
		this.sync.onUpdated((data) => {
			this.update(data);
		});

		this.node.className = 'group';
		this.node.style.marginTop = '0.5em';
		this.node.style.padding = '0.2em 1em';

		this.memberName = SV.el('h1', {
			parent: this.node,
			className: 'light' });
		this.points = SV.el('h2', { parent: this.node, className: 'light' });
		this.pointsView = new PointsView();
		this.node.appendChild(this.pointsView.node);
	}
	render() {
		this.node.style.backgroundColor = this.editMode ? '#EEE' : '#FFF';

		var member = this.data;
		this.memberName.innerHTML = member.info.name;
		this.memberName.style.color = member.info.isStaff ? '#44F' : 'default';
		if(member.loyalty) {
			this.points.innerHTML = 'Points: ' + (member.loyalty.points | 0);
			this.pointsView.update(member.loyalty.pointsHistory);
		}
	}
}
class PointsView extends SyncView {
	constructor() {
		super();
		SV.mergeMap({ padding: '1em' }, this.node.style);

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
		this.dateSpan.innerHTML = moment(this.data.key).format('MM/DD/YYYY hh:mma');
		this.typeSpan.innerHTML = this.data.type;
		this.amountSpan.innerHTML = this.data.amount;
		this.amountSpan.style.color = this.data.type === 'Redeem' ? '#44DD44' : 'initial';
	}
}



SV.startReloader();

var t = new Member();
SV.onLoad(() => { SV.id('container').appendChild(t.node); });

if(location.hash = '#_=_') history.replaceState({}, document.title, '.');;
