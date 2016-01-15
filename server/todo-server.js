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

	}
}



module.exports = TodoServer; 
