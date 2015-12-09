var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var Sync = require('sync-node');
var app = express();
var server = http.createServer(app);
var fs = require('fs');

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


function watch(filename) {
	fs.watchFile(path.join(__dirname, 'client', filename), () => {
		console.log('     Changed!');
		io.emit('reload');
	});
}

watch('todo/index.html');
watch('todo/edit.html');
watch('app/syncviews.js');



/* Debugging */
console.log('ioNamespace', syncServer.namespace);

server.listen(process.env.PORT || 1337, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});
