"use strict"

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var printer = require('printer');
var pdf = require('html-pdf');
var exec = require('child_process').exec;

console.log('here', printer.getDefaultPrinterName());



var buffer = pdf.create('<b style="font-size: 4em">Hello</b> world!').toFile('receipt.pdf', (err, res) => {
	console.log('printing', err, res.filename);
	var cmd = '"C:\\Program Files\\Foxit Software\\Foxit Reader\\FoxitReader.exe" /t "' + res.filename + '" "TSP143LAN"';
	console.log('cmd', cmd);
	exec(cmd, (err, stdout, stderr) => {
		console.log('executed.');
	});
//	printer.printDirect({data: buffer, 
//		type: 'RAW',
//		success: () => { console.log('Printed.'); },
//		error: (err) => { console.log('Error: ', err); }});


});



//var list = printer.getPrinters();
//console.log('printers', list);

return;



var app = express();

app.use('/', express.static('client/'));


var server = http.createServer(app);
server.listen(process.env.PORT || 1337, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});
