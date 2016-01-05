"use strict"

class NotesServer {
	constructor(app, io, security) {		
		console.log('starting notes server');
		this.app = app;


		app.all('/my/notes', (req, res, next) => {
			if(!req.user) {
				res.redirect('/login?url=/my/notes');
			} else {
				if(security(req.user, 'notes')) {
					next();
				} else {
					res.end('Unauthorized');
				}
			}
		});


		this.io = io.of('/notes');

		this.io.on('connection', (socket) => {
			console.log('connected to notes server!');
			socket.on('addNote', () => {
				console.log('Add Note!', socket.request.user);
			});
		});
	}
}



module.exports = TriviaServer; 
