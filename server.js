"use strict"

var express = require('express');
var http = require('http');
var https = require('https');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var session = require('express-session');
var Sync = require('./server/SyncNodeServer.js');
var helmet = require('helmet');
var express_enforces_ssl = require('express-enforces-ssl');
var passportSocketIo = require('passport.socketio');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var MemberServer = require('./server/MemberServer.js').MemberServer;

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
		this.dataPath = path.join('..', 'data', 'sessions.json');
		try {
			var data = fs.readFileSync(this.dataPath, 'utf8');
			this.sessions = JSON.parse(data);
		} catch(e) {
			if (e.code !== 'ENOENT') {
				console.error('Failed to read ' + this.dataPath + ': ', e);
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
		fs.writeFile(this.dataPath, JSON.stringify(this.sessions), function (err) {
			if (err) {
				console.error('Failed to write ' + this.dataPath + ': ' + err);
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
	maxAge: 360000000,
	store: sessionStore }));




var server = http.createServer(app);
var sserver;

var io;

if(startHTTPS) {

	var certPath = '/etc/letsencrypt/live/thecoalyard.com/';
	var options = {
		key: fs.readFileSync(certPath + 'privkey.pem', 'utf8'),
		cert: fs.readFileSync(certPath + 'cert.pem', 'utf8'),
		ca: fs.readFileSync(certPath + 'chain.pem', 'utf8')
	};
	sserver = https.createServer(options, app);
	io = socketio.listen(sserver);
} else {
	io = socketio.listen(server);
}


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
app.post('/deleteupload', function (req, res, next) {
	console.log('delete', req.body);
	res.end();
	if(req.body.image) {
		fs.unlink(path.join(imagesPath, req.body.image));
	}
});


app.use('/images', express.static(imagesPath));


var syncServer = new Sync.SyncNodeServer('data', io, {});
var membersServer = new MemberServer(io);



var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, cb) {
	cb(null, user.key);
});

passport.deserializeUser(function(id, cb) {
	cb(null, membersServer.data[id]);
});


var findUser = (comparator) => {
	var keys = Object.keys(membersServer.data);	
	for(var i = 0; i < keys.length; i++) {
		var key = keys[i];
		if(key !== 'lastModified') {
			var currUser = membersServer.data[key];
			if(comparator(currUser)) {
				return currUser;
			}
		}
	}
};

function normalizeEmail(email) {
	var normalized = email ? email.trim().toLowerCase() : null;
	return (normalized && normalized !== '') ? normalized : null;
}

function emailsMatch(email1, email2) {
	if(email1 && email2) {
		return normalizeEmail(email1) === normalizeEmail(email2);
	} else {
		return false;
	}
}

passport.use(new LocalStrategy(function(username, password, done) {
	var user = findUser((user) => {
		if(user.data && user.data.info && user.data.info.email && username) {
			return emailsMatch(user.data.info.email, username);
		}
	});

	if(user) {
		if(user.password === password) {
			done(null, user);
		} else {
			console.log('Incorrect password: ', user);
			done('Incorrect password', false);
		}
	} else {
		done('Unknown username', false);
	}
}));

passport.use(new FacebookStrategy({
		clientID: config.facebook.appId,
		clientSecret: config.facebook.appSecret,
		profileFields: ['id', 'emails', 'name']
	},
	(accessToken, refreshToken, profile, done) => {
		console.log('profile', profile);
		var user = findUser((user) => {
			var match = false;
			profile.emails.forEach((email) => {
				if(user.data &&
					user.data.info &&
					user.data.info.email &&
					emailsMatch(email.value, user.data.info.email)) {
					match = true;
				}
			});
			return match;
		});
		if(!user) {
			console.log('User not found', profile.emails);
			done(null, null);
		} else {
			done(null, user);
		}
	}
));
app.use(passport.initialize());
app.use(passport.session({
	name: 'rmsSession',
	secret: config.sessions.secret,
	secure: startHTTPS 
}));

var successRedirect = (req, res) => {
	console.log('###########uri', req.query.url);
	var redirect = '/member';
	var split = req.url.split('?');
	if(split.length > 1) {
		var params = split[1].split('=');
		if(params.length > 1 && params[0].toLowerCase() === 'url') {
			redirect = params[1].split('&')[0];
			if(redirect[0] !== '/') redirect = '/' + redirect;
		}
	}
	console.log('authenticated as', req.user.data.info.name);
	console.log('redirect', redirect);
	res.redirect(redirect);
};

app.get('/auth/facebook', (req, res, next) => { 
	var callbackURL = '/auth/facebook/callback';
		passport.authenticate(
			'facebook', 
			{ scope: "public_profile,email",
		       	  callbackURL: callbackURL })(req, res, next);
		});
app.get('/auth/facebook/callback', (req, res, next) => { 
	var callbackURL = '/auth/facebook/callback';
		passport.authenticate(
			'facebook', 
			{ 
				failureRedirect: '/login',
		       	  callbackURL: callbackURL })(req, res, next);
}, successRedirect);

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), successRedirect);

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});





function userIsAllowed(user, permission) {
	return user.permissions.all || user.permissions[permission];
}



var enforcePermission = (route, permission) => {
	app.all(route, (req, res, next) => {
		if(!req.user) {
			res.redirect('/login?url=' + req.url);
		} else if(userIsAllowed(req.user, permission)) {
			next();
		} else {
			res.statusCode = 403;
			res.end('Unauthorized.');
		}
	});
};

enforcePermission('/member/todo/*', 'todo');
enforcePermission('/manage/members/*', 'members');


app.all('/manage/*', (req, res, next) => {
	if(!req.user) {
		res.redirect('/login?url=' + req.url);
	} else {
		next();
	}
});

app.all('/member/*', (req, res, next) => {
	if(!req.user) {
		res.redirect('/login?url=' + req.url);
	} else {
		next();
	}
});


//var CalendarServer = require('./server/calendar-server.js');
//new CalendarServer(app, io, userIsAllowed);


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
	sendText(membersServer.data.admin.data.info.phone, body);
}

io.on('connection', (socket) => {
	socket.on('send text', (msg) => {	
		sendText(msg.phone, msg.body);
	});
	socket.on('send text to admin', (body) => {	
		sendTextToAdmin(body);
	});
});

var xoauth2 = require('xoauth2');
var generator = xoauth2.createXOAuth2Generator({
	user: config.gmail.user,
	clientId: config.gmail.client_id,
	clientSecret: config.gmail.client_secret,
	refreshToken: config.gmail.refresh_token
});
generator.on('token', function(token){
  console.info('new token', token.accessToken);
  // maybe you want to store this token
});

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var transporter = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    auth: {
	    xoauth2: generator
    }
}));


function sendEmailFromAdmin(address, subject, htmlBody) {
	var mailOptions = {
		from: 'The Coal Yard <management@thecoalyard.com>',
		to: address,
		subject: subject, 
		html: htmlBody 
	};

	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
}

io.on('connection', (socket) => {
	socket.on('send email from admin', (msg) => {	
		console.log('sending email: ', msg);
		sendEmailFromAdmin(msg.address, msg.subject, msg.htmlBody);
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
  console.log('successful connection to socket.io', data.user.data.info.name);
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









var chokidar = require('chokidar');

/* For Debugging, send signal when file changes */
chokidar.watch('./client', { depth: 99 }).on('change', (filePath) => {
	if(filePath.match(/\.js$/i) !== null) {
		console.log('js file changed', filePath);
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
