var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var Sync = require('sync-node');
var app = express();

var fs = require('fs');
var options = {
	key: fs.readFileSync('../key.pem', 'utf8'),
	cert: fs.readFileSync('../server.crt', 'utf8')
};

var server = http.createServer(app);
var sserver = https.createServer(options, app);
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

sserver.listen(443, process.env.IP || "0.0.0.0", function(){
  var addr = sserver.address();
  console.log("HTTPS Server listening at", addr.address + ":" + addr.port);
});


