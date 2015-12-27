var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var Sync = require('sync-node');
var app = express();
var server = http.createServer(app);
var chokidar = require('chokidar');




app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var io = socketio.listen(server);

var defaultData = {
    todos: {
        '0': {
            key: '0', text: 'First group',
            items: {
		'0': {
		    key: '0', text: 'Do the first thing', isComplete: false
		}
	    }
    	}
    }
};

var syncServer = new Sync.SyncNodeServer('data', io, defaultData);
app.use('/', express.static(path.join(__dirname, 'client/')));

// using this for debugging...
app.get('/data/reset', function (req, res) {
    syncServer.resetData(defaultData);
    res.send('Reset.');
});

app.get('/test', function (req, res) {
    res.send('Test response!');
});








// Your accountSid and authToken from twilio.com/user/account
var accountSid = 'AC600d9e435f0dbbf9df043ba8c860bd6a';
var authToken = "984c52da67bca40b816b94eb928f70e7";
var twilio = require('twilio')(accountSid, authToken);


io.on('connection', (socket) => {
	console.log('connection!');
	socket.on('send text', (msg) => {	
		twilio.messages.create({
		    body: msg.body,
		    to: '+1' + msg.phone,
		    from: "+18032237643"
		}, (err, message) => {
			if(err) console.log('Error sending txt: ' + JSON.stringify(err));
		    	else console.log('Sent text message: ' + JSON.stringify(message));
		});


	});

});













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
