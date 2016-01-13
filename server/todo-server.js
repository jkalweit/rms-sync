"use strict"

class TodoServer {
	constructor(app, io, security) {		
		console.log('starting todo server');
		this.app = app;


		app.all('/my/todo', (req, res, next) => {
			if(!req.user) {
				res.redirect('/login?url=/my/todo');
			} else {
				if(security(req.user, 'todo')) {
					next();
				} else {
					res.end('Unauthorized');
				}
			}
		});


		this.io = io.of('/my/todo');

		this.io.on('connection', (socket) => {
			console.log('connected to todo server for ' + socket.request.user.key);
		});
	}
}



module.exports = TodoServer; 
