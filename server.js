"use strict"

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var session = require('express-session');
var Sync = require('./server/SyncNodeServer.js');
var passportSocketIo = require('passport.socketio');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var fetch = require('node-fetch');
var sass = require('node-sass-middleware');
var MemberServer = require('./server/MemberServer.js').MemberServer;

var pdf = require('html-pdf');
var exec = require('child_process').exec;

const EventEmitter = require('events');


var isDebug = process.env.NODE_ENV === 'debug';
if(isDebug) console.log('RUNNING IN DEBUG MODE');



var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);


var config = JSON.parse(fs.readFileSync('../data/config.json'));



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




app.use(function (req, res, next) {
	if(isDebug) {
		res.header("Access-Control-Allow-Origin", "*");
	} else {		
		res.header("Access-Control-Allow-Origin", "//www.thecoalyard.com");
	}
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.header('Expires', '-1');
	res.header('Pragma', 'no-cache');
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
var progressServer = new Sync.SyncNodeServer('progress', io, {});
var membersServer = new MemberServer(io);



var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

passport.serializeUser(function(user, cb) {
	cb(null, user.key);
});

passport.deserializeUser(function(id, cb) {
	if(membersServer.data) {
		cb(null, membersServer.data[id]);
	} else {
		cb('No memberServer data...', null);
	}
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
	secret: config.sessions.secret
}));

var escapeURI = (uri) => { return uri.replace(/\//g, '%2f');  };

var successRedirect = (req, res) => {
	console.log('########### success', req.params);
	var redirect = req.params.uri;
	console.log('authenticated as', req.user.data.info.name);
	console.log('redirect', redirect);
	res.redirect(redirect);
};

app.get('/auth/facebook/:uri', (req, res, next) => { 
	console.log('###########uri login', req.params);
	var callbackURL = 'https://www.thecoalyard.com/auth/facebook/callback/' + escapeURI(req.params.uri);
	passport.authenticate(
		'facebook', 
		{ scope: "public_profile,email",
			callbackURL: callbackURL })(req, res, next);
});
app.get('/auth/facebook/callback/:uri', (req, res, next) => { 
	console.log('###########uri callback', req.params);
	var callbackURL = 'https://www.thecoalyard.com/auth/facebook/callback/' + escapeURI(req.params.uri);
	passport.authenticate(
		'facebook', 
		{ 
			failureRedirect: '/login',
		callbackURL: callbackURL })(req, res, next);
}, successRedirect);

app.post('/login/:uri', (req, res, next) => {
	console.log('###########uri local', req.params);
	passport.authenticate('local', { failureRedirect: '/login' })(req, res, next);
}, successRedirect);

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});





function userIsAllowed(user, permission) {
	return user.permissions.all || user.permissions[permission];
}



var enforcePermission = (route, permission) => {
	app.all(route, (req, res, next) => {
		if(!req.user || !req.user.logged_in) {
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


app.use(sass({
	src: __dirname + '/client',
	dest: __dirname + '/client',
	debug: true
}));

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
	if(isDebug) return;

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
	socket.on('send kitchen order', (order) => {	
		console.log('sending order: ', order);
		fetch('http://192.168.6.5:1337/api/kitchen/orders', { 
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},	
			body: JSON.stringify(order) })
			.then((res) => {
				console.log('Send kitchen order status:', res.status);
			}).catch((error) => {
				console.log('Twas an error while sending kitchen order: ', error);
			});
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



io.on('connection', (socket) => {
	socket.on('print', (html) => {	
		print(html);
	});
});



function print(html) {
	console.log('print!', html);

	var options = {
		width: '3in',
		border: { 
			right: '6in'
		}
	};

	var buffer = pdf.create(html, options).toFile('receipt.pdf', (err, res) => {
		if(err) {
			console.log('Error while printing: ', err, res.filename);
		} else {
			var cmd = '"C:\\Program Files\\Foxit Software\\Foxit Reader\\FoxitReader.exe" /t "' + res.filename + '" "TSP143LAN"';
			exec(cmd, (err, stdout, stderr) => {
				if(err) {					
					console.log('Error while executing print command: '. err);
				}
			});
		}
	});
}








var chokidar = require('chokidar');

/* For Debugging, send signal when file changes */
chokidar.watch('./client', { depth: 99 }).on('change', (filePath) => {
	if(filePath.match(/\.js$/i) !== null 
		|| filePath.match(/\.html$/i) !== null 
//		|| filePath.match(/\.css$/i) !== null
		|| filePath.match(/\.scss$/i) !== null
		) {
		console.log('js file changed', filePath);
		io.emit('reload');
	};
});



server.listen(process.env.PORT || 1337, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Rec Server listening at", addr.address + ":" + addr.port);
});

