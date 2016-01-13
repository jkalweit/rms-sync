"use strict"

var Sync = require('sync-node');

class CalendarServer {
	constructor(app, io, security) {		
		console.log('starting calendar server');
		this.app = app;


		app.all('/my/calendar', (req, res, next) => {
			console.log('Do security');
			if(!req.user) {
				res.redirect('/login?url=/my/calendar');
			} else {
				if(security(req.user, 'calendar')) {
					next();
				} else {
					res.end('Unauthorized');
				}
			}
		});

		this.syncServer = new Sync.SyncNodeServer('calendar', io, { weeks: {} }); 
		this.syncServer.start();
		
		this.syncServer.ioNamespace.on('connection', (socket) => {
			console.log('connected to calendar server!');
			socket.on('doTest', () => { console.log('do the calendar test!!!!!!!!!!!!!!!!', socket.request.user); });
		});
		
	}
}



module.exports = CalendarServer; 
