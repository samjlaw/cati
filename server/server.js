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

//Master list of cards.
var all_white_cards = [];
all_white_cards[0] = 'Cards Against Humanity';
all_white_cards[1] = 'Apples to Apples';
all_white_cards[2] = 'Computer Science';
all_white_cards[3] = 'Cold winter weather in Iowa';
all_white_cards[4] = 'Socket.IO';
all_white_cards[5] = 'Discord'
all_white_cards[6] = 'Capstone'
all_white_cards[7] = 'Simpson College'
all_white_cards[8] = 'Carver Science Lab'
all_white_cards[9] = 'Pfeiffer'
all_white_cards[10] = 'MICS'
all_white_cards[11] = 'CATI'
all_white_cards[12] = 'Hello World!'
all_white_cards[13] = 'white_cards[13]'
all_white_cards[14] = 'Don\'t Click This'
all_white_cards[15] = 'Beep Beep Boop';

//Currently available cards in the current session. Starts off as full as master list.
var available_cards = all_white_cards.slice();

//Receiving connection from clients (socket.emit for local, io.emit for server)
io.on('connection', (socket) => {
	//Add client to the list of clients, and let the server know a player is in.
	clients.push(socket);
	console.log('A player has connected');
	socket.emit('player_update', names);
	
	//When client sends a message to the server, send the text to all clients.
	socket.on('message', (text) => {
		io.emit('message', socket.name + ': ' + text);
		//debug
		if (text == '!resubmit') socket.played = false;
		if (text == '!refresh') available_cards = all_white_cards.slice();
	});
	
	//If the client hasn't played yet, when client plays a card, send the contents of the card.
	socket.on('action', (content) => {
		if (!socket.played) {
			io.emit('message', 'SYSTEM: ' + socket.name + ' played the "' + content + '" card.');
			socket.played = true;
		}
	});
	
	//When client sets a name, check if it's available. If it is, assign them the name. Otherwise, have them do it again.
	socket.on('name_set', (name) => {
		var duplicate = false;
		for(let i = 0; i < names.length; i++) {
			if(names[i].toUpperCase() == name.toUpperCase()) {
				duplicate = true;
			}
		}
		if (duplicate || name.toUpperCase() == 'SYSTEM' || name == '') {
			socket.emit('message', 'SYSTEM: Sorry, that name is unavailable. Try again.');
		}
		else if (name.includes(' ') || name.includes('	')) {
			socket.emit('message', 'SYSTEM: Sorry, names cannot have spaces. Try again.');
		}
		else if (name.length >= 15) {
			socket.emit('message', 'SYSTEM: Sorry, names are limited to 15 characters or less. Try again.');
		}
		else {
			//Give player their name, add name to list of names, and send list of names to client.
			names.push(name);
			socket.name = name;
			socket.emit('name_set', name);
			socket.played = false;
			io.emit('message', 'SYSTEM: ' + socket.name + ' has connected to the server.');
			io.emit('player_update', names);
			
			//Randomly generate deck of cards for player.
			var player_deck = [];
			for(let i = 0; i < 5; i++) {
				var rand = Math.floor(Math.random()*available_cards.length);
				player_deck[i] = available_cards[rand];
				available_cards.splice(rand,1);
			}
			socket.emit('create_deck', player_deck);
		}
	});
	
	//Let the server know when a player is leaving. Remove the client and their name from the respective lists.
	socket.on('disconnect', function() {
		console.log('A player has disconnected.');
		clients.splice(clients.indexOf(socket),1);
		if (socket.name != null) {
			io.emit('message', 'SYSTEM: ' + socket.name + ' has left the server.');
			names.splice(names.indexOf(socket.name),1);
			io.emit('player_update', names);
		}
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