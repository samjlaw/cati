//Setup necessary frameworks.
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const client_dir = `${__dirname}/../client`;
console.log(`Serving static from ${client_dir}`);
app.use(express.static(client_dir));

const server = http.createServer(app);
const io = socketio.listen(server);

//Master list of cards.
var all_white_cards = [];
all_white_cards[0] = 'Cards Against Humanity';
all_white_cards[1] = 'Apples to Apples';
all_white_cards[2] = 'Computer Science';
all_white_cards[3] = 'Cold winter weather in Iowa';
all_white_cards[4] = 'Socket.IO';
all_white_cards[5] = 'Discord';
all_white_cards[6] = 'Capstone';
all_white_cards[7] = 'Simpson College';
all_white_cards[8] = 'Carver Science Lab';
all_white_cards[9] = 'Pfeiffer';
all_white_cards[10] = 'MICS';
all_white_cards[11] = 'CATI';
all_white_cards[12] = 'Hello World!';
all_white_cards[13] = 'white_cards[13]';
all_white_cards[14] = 'Don\'t Click This';
all_white_cards[15] = 'Beep Beep Boop';

//Currently available cards in the current session. Starts off as full as master list.
var available_cards = all_white_cards.slice();

function player_update(room) {
	//Don't do anything if the last person leaves, and the room becomes empty
	if (io.sockets.adapter.rooms[room] != null) {
		//Get list of all clients in room and send their names and scores to clients.
		var clients = io.sockets.adapter.rooms[room].sockets;
		var names_scores = [];
		for (var clientID in clients) {
			var clientSocket = io.sockets.connected[clientID];
			names_scores.push(clientSocket.name + ' - Score: ' + clientSocket.score);
		}
		io.sockets.in(room).emit('player_update', names_scores);
	}
}

//Receiving connection from clients (socket.emit for local, io.emit for server)
io.sockets.on('connection', (socket) => {
	//Add client to the list of clients, and let the server know a player is in.
	console.log('A player has connected');
	
	//Have the player join a specified room. If they are the creator of the room, they will start as the judge and be granted special permissions.
	socket.on('room', (room) => {
		room = room.toUpperCase();
		if (room.length != 4 || room.includes(' ') || room.includes('	')) {
			socket.emit('message', 'SYSTEM: Please enter a valid room code.');
		}
		else {
			socket.join(room);
			socket.room = room;
			socket.emit('room_set', room);
			if (io.sockets.adapter.rooms[room].length == 1) {
				socket.host = true;
				socket.judge = true;
				socket.emit('message', 'SYSTEM: You are the host of the "' + room + '" room! Enter your name, and type "!start" to begin the game.');
				io.sockets.adapter.rooms[room].available_cards = all_white_cards.slice();
			}
			else socket.emit('message', 'SYSTEM: You joined the "' + room + '" room. Now, please enter your name before starting.');
		}
	});
	
	//When client sets a name, check if it's available. If it is, assign them the name. Otherwise, have them do it again.
	socket.on('name_set', (name) => {
		var clients = io.sockets.adapter.rooms[socket.room].sockets;
		
		//Don't allow name if it's already in the room.
		var duplicate = false;
		for (var clientID in clients) {
			var clientSocket = io.sockets.connected[clientID];
			if (clientSocket.name != null) {
				if (name.toUpperCase() == clientSocket.name.toUpperCase()) {
					duplicate = true;
				}
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
			//Give player their name, update the client's list of player names, and create their deck.
			socket.name = name;
			socket.score = 0;
			socket.emit('name_set', name);
			socket.played = false;
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' has joined the room!');
			player_update(socket.room);
			
			//Randomly generate deck of cards for player from the list of available cards in the room.
			var player_deck = [];
			for(let i = 0; i < 5; i++) {
				var rand = Math.floor(Math.random() * io.sockets.adapter.rooms[socket.room].available_cards.length);
				player_deck[i] = io.sockets.adapter.rooms[socket.room].available_cards[rand];
				io.sockets.adapter.rooms[socket.room].available_cards.splice(rand,1);
			}
			socket.emit('create_deck', player_deck);
		}
	});
	
	//When client sends a message to the server, send the text to all clients.
	socket.on('message', (text) => {
		io.sockets.in(socket.room).emit('message', socket.name + ': ' + text);
		//debug
		if (text == '!resubmit') socket.played = false;
		if (text == '!refresh') io.sockets.adapter.rooms[socket.room].available_cards = all_white_cards.slice();
		if (text == '!giveScore') {
			socket.score += 1;
			player_update(socket.room);
		}
	});
	
	//If the client hasn't played yet, when client plays a card, send the contents of the card.
	socket.on('action', (content) => {
		if (!socket.played) {
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' played the "' + content + '" card.');
			socket.played = true;
		}
	});
	
	//Let the room know when a player is leaving. Remove the client from the room list.
	socket.on('disconnect', function() {
		console.log('A player has disconnected.');
		if (socket.name != null) {
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' has left the room.');
			player_update(socket.room);
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