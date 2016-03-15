"use strict"

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var printer = require('printer');
var pdf = require('html-pdf');
var exec = require('child_process').exec;

console.log('here', printer.getDefaultPrinterName());



//var list = printer.getPrinters();
//console.log('printers', list);




var app = express();

app.all('/print', (req, res, next) => {
	console.log('print!', req.body);

	var html = `<b>Receipt: ${req.body.name}</b>`;

	var buffer = pdf.create(html).toFile('receipt.pdf', (err, res) => {
		console.log('printing', err, res.filename);
		var cmd = '"C:\\Program Files\\Foxit Software\\Foxit Reader\\FoxitReader.exe" /t "' + res.filename + '" "TSP143LAN"';
		exec(cmd, (err, stdout, stderr) => {
			console.log('executed.');
		});
	});

	res.send('done');
});



var server = http.createServer(app);
server.listen(process.env.PORT || 1338, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});
