//Setup necessary frameworks.
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const client_dir = `${__dirname}/../client`;
console.log(`Serving static from ${client_dir}`);
app.use(express.static(clientDir));

const server = http.createServer(app);
const io = socketio(server);


//Receiving connection from clients
io.on('connection', (socket) => {
	console.log('A player has connected');
	//use socket.emit for personal messages, io.emit for server-wide
	io.emit('message', 'A player has connected to the server.');
	
	//When client sends a message to the server, send the text to all clients.
	//'message' is a keyword to decide what to do with what is sent (text), not a string.
	socket.on('message', (text) => {
		io.emit('message', text);
	});
});

//Exception Handling
server.on('error', (err) => {
	console.error('Server Error:', err);
});

//Initializing Server
server.listen(8080, () => {
	console.log('CATI Started on 8080');
});