//Setup necessary frameworks.
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const client_dir = `${__dirname}/../client`;
console.log(`Serving static from ${client_dir}`);
app.use(express.static(client_dir));

const server = http.createServer(app);
const io = socketio(server);

//Clients is a list of all clients, names is a list of all currently taken names.
var clients = [];
var names = [];

//Receiving connection from clients (socket.emit for local, io.emit for server)
io.on('connection', (socket) => {
	//Add client to the list of clients, and let the server know a player is in.
	clients.push(socket);
	console.log('A player has connected');
	
	//When client sends a message to the server, send the text to all clients.
	socket.on('message', (text) => {
		io.emit('message', socket.name + ': ' + text);
	});
	
	//When client plays a card, send the contents of the card.
	socket.on('action', (content) => {
		io.emit('message', 'SYSTEM: ' + socket.name + ' played the "' + content + '" card.');
	});
	
	//When client sets a name, check if it's available. If it is, assign them the name. Otherwise, have them do it again.
	socket.on('name_set', (name) => {
		if (names.includes(name) || name.toUpperCase() == 'SYSTEM' || name == '') {
			socket.emit('message', 'SYSTEM: Sorry, that name is unavailable. Try again.');
		}
		else if (name.includes(' ') || name.includes('	')) {
			socket.emit('message', 'SYSTEM: Sorry, names cannot have whitespace. Try again.');
		}
		else if (name.length >= 15) {
			socket.emit('message', 'SYSTEM: Sorry, names are limited to 15 characters or less. Try again.');
		}
		else {
			names.push(name);
			socket.name = name;
			socket.emit('name_set', name);
			io.emit('message', 'SYSTEM: ' + socket.name + ' has connected to the server.');
		}
	});
	
	//Let the server know when a player is leaving. Remove the client and their name from the respective lists.
	socket.on('disconnect', function() {
		console.log('A player has disconnected.');
		if (socket.name == null) io.emit('message', 'SYSTEM: An anonymous player has left the server.')
		else io.emit('message', 'SYSTEM: ' + socket.name + ' has left the server.');
		
		clients.splice(clients.indexOf(socket),1);
		names.splice(names.indexOf(socket.name),1);
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