"use strict"

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var Sync = require('./server/SyncNodeServer.js');
var fs = require('fs');
var path = require('path');
var fetch = require('node-fetch');
var MemberServer = require('./server/MemberServer.js').MemberServer;

const EventEmitter = require('events');


var isDebug = process.env.NODE_ENV === 'debug';
if(isDebug) console.log('RUNNING IN DEBUG MODE');


var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);


var config = JSON.parse(fs.readFileSync('../data/config.json'));



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



var syncServer = new Sync.SyncNodeServer('data', io, {});
var eventsServer = new Sync.SyncNodeServer('events', io, {});
var progressServer = new Sync.SyncNodeServer('progress', io, {});
var checklistsServer = new Sync.SyncNodeServer('checklists', io, {});
var membersServer = new MemberServer(io);




/*
app.use(sass({
	src: __dirname + '/client',
	dest: __dirname + '/client',
	debug: true
}));
*/


app.use('/', express.static('client/'));




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
	sendText('8035265996', body);
	sendText('6073427924', body);
	sendText('8035261118', body);
}

function sendToPrinter(type, doc, printer) {
	var data = JSON.stringify({ type: type, document: doc });
	console.log('Sending to printer: ', printer, data);

	console.log('length: ' + Buffer.byteLength(data) + ' ' + Buffer.byteLength(data, 'utf8'));

	var req = http.request({
		port: 1338,
		host: printer,
		path: '',
	    	method: 'POST',
    		headers: {
	          'Content-Type': 'application/json',
		  'Content-Length': Buffer.byteLength(data, 'utf8')
	      	}	
	}, (response) => {
		response.on('data', (chunk) => {
			console.log(`Printer Response: ${chunk}`);
		});
		response.on('end', () => {
			console.log('Print End');
		});
	});

	req.on('error', (err) => { console.error('failed to print ' + type); });

	req.write(data);
	req.end();
	
	console.log('Send to Printer');
}

function printReceipt(receipt, printer) {
	sendToPrinter('ticket receipt', receipt, printer);
}
function printKitchen(kitchenOrder, printer) {
	sendToPrinter('kitchen order', kitchenOrder, printer);
}
function printRec(rec, printer) {
	sendToPrinter('reconciliation receipt', rec, printer);
}

io.on('connection', (socket) => {
	socket.on('send text', (msg) => {	
		sendText(msg.phone, msg.body);
	});
	socket.on('send text to admin', (body) => {	
		sendTextToAdmin(body);
	});
	socket.on('print receipt', (receipt, printer) => {
		printReceipt(receipt, printer);
	});
	socket.on('print kitchen', (kitchenOrder, printer) => {
		printKitchen(kitchenOrder, printer);
	});
	socket.on('print reconciliation receipt', (rec, printer) => {
		printRec(rec, printer);
	});
	socket.on('play kitchen bell', () => {
		eventsServer.ioNamespace.emit('play kitchen bell');
	});
	socket.on('verify admin pin', (pin, guid) => {	
		socket.emit('verify admin pin result', guid, pin == config.admin.pin);
		console.log('verifying pin4', pin, guid, pin == config.admin.pin);
	});
});


io.on('connection', (socket) => {
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

