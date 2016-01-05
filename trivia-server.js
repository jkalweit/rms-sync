"use strict"

class TriviaServer {
	constructor(app, io, security) {		
		console.log('starting trivia server');
		this.app = app;


		app.all('/my/trivia', (req, res, next) => {
			console.log('Do security');
			if(!req.user) {
				res.redirect('/login?url=/my/trivia');
			} else {
				if(security(req.user, 'trivia')) {
					next();
				} else {
					res.end('Unauthorized');
				}
			}
		});


		this.io = io.of('/trivia');

		this.io.on('connection', (socket) => {
			console.log('connected to trivia server!');
			socket.on('doTest', () => { console.log('do the test!!!!!!!!!!!!!!!!', socket.request.user); });
		});
	}
}



module.exports = TriviaServer; 
