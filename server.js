"use strict"

var express = require('express');
var http = require('http');
var https = require('https');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var session = require('express-session');
var Sync = require('sync-node');
var helmet = require('helmet');
var express_enforces_ssl = require('express-enforces-ssl');
var passportSocketIo = require('passport.socketio');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var SecureSyncNodeServer = require('./server/SecureSyncNodeServer.js').SecureSyncNodeServer;

const EventEmitter = require('events');



var startHTTPS = process.env.NODE_ENV !== 'debug';
if(!startHTTPS) console.log('Running in debug mode, no HTTPS', process.env.NODE_ENV);

var app = express();


var config = JSON.parse(fs.readFileSync('../data/config.json'));


if(startHTTPS) {
	var forceDomain = require('forcedomain');
	app.use(forceDomain({
		hostname: 'www.thecoalyard.com',
		protocol: 'https'
	}));
}


//app.use(express_enforces_ssl());
app.use(helmet());
app.use(helmet.noCache());
app.use(helmet.hsts({
	  maxAge: 10886400000,     // Must be at least 18 weeks to be approved by Google 
	  includeSubdomains: true, // Must be enabled to be approved by Google 
	  preload: true
}))


var fs = require('fs');
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
app.use(session({ 
	name: 'rmsSession',
	resave: false, 
	saveUninitialized: false, 
	secret: config.sessions.secret, 
	store: sessionStore }));




var server = http.createServer(app);
var sserver;

var io;

if(startHTTPS) {

	var path = '/etc/letsencrypt/live/thecoalyard.com/';
	var options = {
		key: fs.readFileSync(path + 'privkey.pem', 'utf8'),
		cert: fs.readFileSync(path + 'cert.pem', 'utf8')
	};
	sserver = https.createServer(options, app);
	io = socketio.listen(sserver);
} else {
	io = socketio.listen(server);
}

var chokidar = require('chokidar');



app.use(function (req, res, next) {
	if(startHTTPS) {
		res.header("Access-Control-Allow-Origin", "//www.thecoalyard.com");
	} else {		
		res.header("Access-Control-Allow-Origin", "*");
	}
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var imagesPath = path.join('..', 'uploads', 'imgs');
var multerStorage = multer.diskStorage({
	destination: imagesPath,
	filename: (req, file, cb) => {
		var destination = req.body.destination || 'img-' + Date.now();
		cb(null, path.join(destination + '.jpg'));
	}
});

var upload = multer({ storage: multerStorage });
app.post('/upload', upload.single('image'), function (req, res, next) {
	console.log('req.file', req.file);
	res.end(req.file.filename);
});

app.use('/images', express.static(imagesPath));



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
			console.log('Authenticated: ', user.name);
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
app.use(passport.session({
	name: 'rmsSession',
	secret: config.sessions.secret,
	secure: startHTTPS 
}));

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),
		function(req, res) {
			var redirect = '/my/';
			var split = req.url.split('?');
			if(split.length > 1) {
				var params = split[1].split('=');
				if(params.length > 1 && params[0].toLowerCase() === 'url') {
					redirect = params[1];
				}
			}
			console.log('authenticated as', req.user, req.url);
			res.redirect(redirect);
		});






var syncServer = new Sync.SyncNodeServer('data', io, {});

function userIsAllowed(user, permission) {
	console.log('user', user);
	return user.permissions.all || user.permissions[permission];
}

app.all('/my/*', (req, res, next) => {
	if(!req.user) {
		res.redirect('/login?url=' + req.url);
	} else {
		next();
	}
});




var TriviaServer = require('./server/trivia-server.js');
new TriviaServer(app, io, userIsAllowed);

var CalendarServer = require('./server/calendar-server.js');
new CalendarServer(app, io, userIsAllowed);

var TodoServer = require('./server/todo-server.js');
new TodoServer(app, io, userIsAllowed);


var usersServer = new SecureSyncNodeServer('/users', io, { todos: {} });
usersServer.start();

app.use('/', express.static('client/'));

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
	console.log(`Send Text: ${phone} ${body}`);
	if(!startHTTPS) return;

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
	socket.on('send text', (msg) => {	
		sendText(msg.phone, msg.body);
	});
	socket.on('send text to admin', (body) => {	
		sendTextToAdmin(body);
	});
});




io.use(passportSocketIo.authorize({
	cookieParser: require('cookie-parser'),       // the same middleware you registrer in express
	key:          'rmsSession',       // the name of the cookie where express/connect stores its session_id
	secret:       config.sessions.secret,    // the session_secret to parse the cookie
	store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
	success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
	fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));



function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io', data.user.name);
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

if(startHTTPS) {
	sserver.listen(443, process.env.IP || "0.0.0.0", function(){
		var addr = sserver.address();
		console.log("HTTPS Server listening at", addr.address + ":" + addr.port);
	});
}
