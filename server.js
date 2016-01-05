"use strict"

var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var session = require('express-session');
var Sync = require('sync-node');
var helmet = require('helmet');
var passportSocketIo = require('passport.socketio');
var fs = require('fs');
var path = require('path');
const EventEmitter = require('events');

var app = express();


var config = JSON.parse(fs.readFileSync('../config.json'));



app.use(helmet());
var cookieParser = require('cookie-parser')(config.sessions.secret);
app.use(cookieParser);

class MapSessionStore extends session.Store {
	constructor() {
		super();
		this.path = path.join('..', 'data', 'sessions.json');
		try {
			var data = fs.readFileSync(this.path, 'utf8');
			this.sessions = JSON.parse(data);
		} catch(e) {
			if (e.code !== 'ENOENT') {
				console.error('Failed to read ' + path + ': ', e);
			}
			console.log('Creating empty session store.');
			this.sessions = {};
		}
	} 
	destroy(sid, callback) {
		console.log('destroy session', sid);
		delete this.sessions[sid];
		callback(null);
	}
	get(sid, callback) {
		callback(null, this.sessions[sid]);
	}
	set(sid, session, callback) {
		this.sessions[sid] = session;
		fs.writeFile(this.path, JSON.stringify(this.sessions), function (err) {
			if (err) {
				console.error('Failed to write ' + path + ': ' + err);
			}
		});
		callback(null);
	}
}

var sessionStore = new MapSessionStore();
app.use(session({ resave: false, 
	saveUninitialized: false, 
	secret: config.sessions.secret, 
	store: sessionStore }));





var server = http.createServer(app);
var chokidar = require('chokidar');




app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function(user, cb) {
	cb(null, user.key);
});

passport.deserializeUser(function(id, cb) {
	cb(null, config.users[id]);
});


passport.use(new LocalStrategy(function(username, password, done) {
	var user = config.users[username];	
	if(user) {
		if(user.password === password) {
			console.log('Authenticated: ', user);
			done(null, user);
		} else {
			console.log('Incorrect password: ', user);
			done('Incorrect password', false);
		}
	} else {
		done('Unknown username', false);
	}
}));


app.use(passport.initialize());
app.use(passport.session());

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),
		function(req, res) {
			res.redirect('/my');
		});





var io = socketio.listen(server);

var defaultData = {
};

var syncServer = new Sync.SyncNodeServer('data', io, defaultData);

function userIsAllowed(user, permission) {
	console.log('user', user);
	return user.permissions.all || user.permissions[permission];
}

app.all('/my', (req, res, next) => {
	console.log('Do security');
	if(!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
});

app.all('/my/todo', (req, res, next) => {
	console.log('Do security');
	if(!req.user) {
		res.redirect('/login');
	} else {
		if(userIsAllowed(req.user, 'todo')) {
			next();
		} else {
			res.end('Unauthorized');
		}
	}
});

app.all('/my/employees', (req, res, next) => {
	console.log('Do security');
	if(!req.user) {
		res.redirect('/login');
	} else {
		if(userIsAllowed(req.user, 'employees')) {
			next();
		} else {
			res.end('Unauthorized');
		}
	}
});






var TriviaServer = require('./trivia-server.js');
new TriviaServer(app, io, userIsAllowed);





app.use('/', express.static(path.join(__dirname, 'client/')));

// using this for debugging...
app.get('/data/reset', function (req, res) {
    syncServer.resetData(defaultData);
    res.send('Reset.');
});

app.get('/test', function (req, res) {
    res.send('Test response!');
});







var twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);

function sendText(phone, body) {
	twilio.messages.create({
		body: body,
		to: '+1' + phone,
		from: config.twilio.twilioNumber
	}, (err, message) => {
		if(err) console.log('Error sending txt: ' + JSON.stringify(err));
		else console.log('Sent text message: ' + JSON.stringify(message));
	});
}
function sendTextToAdmin(body) {
	sendText(config.users.admin.phone, body);
}

io.on('connection', (socket) => {
	console.log('connection!', socket.request.user);
	socket.on('send text', (msg) => {	
		sendText(msg.phone, msg.body);
	});
	socket.on('send text to admin', (body) => {	
		sendTextToAdmin(body);
	});
});




io.use(passportSocketIo.authorize({
	cookieParser: require('cookie-parser'),       // the same middleware you registrer in express
	key:          'connect.sid',       // the name of the cookie where express/connect stores its session_id
	secret:       config.sessions.secret,    // the session_secret to parse the cookie
	store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
	success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
	fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));



function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io', data.user);
  accept();
}

function onAuthorizeFail(data, message, error, accept){
  accept();
//  if(error)
//    throw new Error(message);
//  console.log('failed connection to socket.io:', message);
//  if(error)
//    accept(new Error(message));
}










/* For Debugging, send signal when file changes */
chokidar.watch('./client', { depth: 99 }).on('change', (path) => {
	if(path.match(/\.js$/i) !== null) {
		console.log('js file changed', path);
		io.emit('reload');
	};
});



server.listen(process.env.PORT || 1337, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});


var startHTTPS = false;
if(startHTTPS) {

	console.log('here');
	var fs = require('fs');
	var options = {
		key: fs.readFileSync('../key.pem', 'utf8'),
		cert: fs.readFileSync('../server.crt', 'utf8')
	};

	var sserver = https.createServer(options, app);
	sserver.listen(443, process.env.IP || "0.0.0.0", function(){
		var addr = sserver.address();
		console.log("HTTPS Server listening at", addr.address + ":" + addr.port);
	});

}
