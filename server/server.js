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

//Master list of all white cards. There should be 160 white cards.
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
all_white_cards[16] = 'MICS';
all_white_cards[17] = 'CATI';
all_white_cards[18] = 'Hello World!';
all_white_cards[19] = 'white_cards[13]';
all_white_cards[20] = 'Don\'t Click This';
all_white_cards[21] = 'Beep Beep Boop';
all_white_cards[22] = 'MICS';
all_white_cards[23] = 'CATI';
all_white_cards[24] = 'Hello World!';
all_white_cards[25] = 'white_cards[13]';
all_white_cards[26] = 'Don\'t Click This';
all_white_cards[27] = 'Beep Beep Boop';
all_white_cards[28] = 'MICS';
all_white_cards[29] = 'CATI';
all_white_cards[30] = 'Hello World!';
all_white_cards[31] = 'white_cards[13]';
all_white_cards[32] = 'Don\'t Click This';
all_white_cards[33] = 'Beep Beep Boop';

//Maser list of all black cards. There should be 20 black cards.
var all_black_cards = [];
all_black_cards[0] = 'I go to _____ class.';
all_black_cards[1] = 'I don\'t go to _____ class.';

//Update the leaderboard of players when a player leaves, or when someone's score changes.
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

//Set the current room's response numbers to zero, clear the judge's cards and player responses from previous round, and send a black card with a new prompt.
function start_round(room) {
	var current_room = io.sockets.adapter.rooms[room];
	current_room.responses = 0;
	current_room.judge_options = [];
	current_room.player_status = [];
	current_room.all_submitted = false;
	
	for (var clientID in current_room.sockets) {
		var clientSocket = io.sockets.connected[clientID];
		clientSocket.played = false;
		if (clientSocket.id == current_room.judge[0]) {
			io.to(clientSocket.id).emit('clear_deck', clientSocket.deck);
		}
		else {
			current_room.player_status.push({name:clientSocket.name, played:clientSocket.played});
		}
	}
	
	var current_cue = Math.floor(Math.random() * current_room.black_cards.length);
	current_room.round_info = {judge:io.sockets.connected[current_room.judge[0]].name, cue:current_room.black_cards[current_cue]};
	current_room.black_cards.splice(current_cue,1);
	io.sockets.in(room).emit('create_gameview', current_room.round_info, current_room.player_status);
}

//Once all black cards have been played, or some other circumstance causes the game to end, declare the winner.
function declare_winner(room) {
	var current_room = io.sockets.adapter.rooms[room];
	var max_score = {name:'', score:-1};
	for (var clientID in current_room.sockets) {
		var clientSocket = io.sockets.connected[clientID];
		io.to(clientSocket.id).emit('clear_deck', clientSocket.deck);
		if (clientSocket.score > max_score.score) {
			max_score.name = clientSocket.name;
			max_score.score = clientSocket.score;
		}
	}
	setTimeout(function() {
		io.sockets.in(room).emit('message', 'SYSTEM: ' + max_score.name + ' is the winner of the game with ' + max_score.score + ' points!');
		io.sockets.in(room).emit('display_winner', max_score.name);
	}, 1000);
}

//Receiving connection from clients (socket.emit for local, io.emit for server)
io.sockets.on('connection', (socket) => {
	//Add client to the list of clients, and let the server know a player is in.
	console.log('A player has connected');
	
	//Have the player join a specified room if there is space for them. If they are the creator of the room, they will start as the judge and be granted special permissions.
	socket.on('room_set', (room) => {
		room = room.toUpperCase();
		if (room.length != 4 || room.includes(' ') || room.includes('	')) {
			socket.emit('message', 'SYSTEM: Please enter a valid room code.');
		}
		else {
			//If the user enters a valid room code, join the room. If there is no space for them, or the game already started, immediately kick them back out.
			socket.join(room);
			var current_room = io.sockets.adapter.rooms[room];
			if (current_room.length > 6) {
				socket.emit('message', 'SYSTEM: Sorry, this room is full. Please try another.');
				socket.leave(room);
			}
			else if (current_room.playing) {
				socket.emit('message', 'SYSTEM: Sorry, this room already started a game. Please try another.');
				socket.leave(room);
			}
			else {
				socket.room = room;
				socket.emit('room_set', room);
				//If the user is the first to join a room, they become the host and the first judge.
				if (current_room.length == 1) {
					socket.host = true;
					socket.emit('message', 'SYSTEM: You are the host of the "' + room + '" room! Enter your name, and then type "!start" to begin the game.');
					current_room.white_cards = all_white_cards.slice();
					current_room.black_cards = all_black_cards.slice();
					current_room.responses = [];
					current_room.judge = [];
					current_room.player_status = [];
					current_room.round_info = [];
					current_room.all_submitted = false;
					current_room.judge.push(socket.id);
					current_room.playing = false;
				}
				//Everyone that joins after the first user is added to the queue of judges.
				else {
					socket.host = false;
					current_room.judge.push(socket.id);
					socket.emit('message', 'SYSTEM: You joined the "' + room + '" room. Now, please enter your name before starting.');
				}
			}
		}
	});
	
	//When client sets a name, check if it's available. If it is, assign them the name. Otherwise, have them do it again.
	socket.on('name_set', (name) => {
		var current_room = io.sockets.adapter.rooms[socket.room];
		
		//Don't allow name if it's already in the room, or if it doesn't meet other criteria.
		var duplicate = false;
		for (var clientID in current_room.sockets) {
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
		else if (name.length > 8) {
			socket.emit('message', 'SYSTEM: Sorry, names are limited to 8 characters or less. Try again.');
		}
		
		else {
			//Give player their name, update the client's list of player names, and create their deck.
			socket.name = name;
			socket.score = 0;
			socket.deck = [];
			socket.played = false;
			socket.emit('name_set', name);
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' has joined the room!');
			player_update(socket.room);
			
			//Randomly generate deck of cards for player from the list of available cards in the room.
			var remaining_cards = 5;
			if (current_room.white_cards.length < 5) remaining_cards = current_room.white_cards.length;
			for (let i = 0; i < remaining_cards; i++) {
				var rand = Math.floor(Math.random() * current_room.white_cards.length);
				socket.deck[i] = {name:socket.name, response:current_room.white_cards[rand]};
				current_room.white_cards.splice(rand,1);
			}
			if (socket.id != current_room.judge[0]) socket.emit('create_deck', socket.deck);
		}
	});
	
	//When client sends a message to the server, send the text to all clients.
	socket.on('message', (text) => {
		var current_room = io.sockets.adapter.rooms[socket.room];
		io.sockets.in(socket.room).emit('message', socket.name + ': ' + text);
		//debug
		if (text == '!refresh') current_room.white_cards = all_white_cards.slice();
		if (text == '!giveScore') {
			socket.score += 1;
			player_update(socket.room);
		}
	});
	
	//Start the game if the host requests to start. If another player tries to start, don't do anything.
	socket.on('start_game', (text) => {
		var current_room = io.sockets.adapter.rooms[socket.room];
		if (!current_room.playing && socket.host) {
			if (current_room.length > 2) {
				io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' is starting the game!');
				current_room.playing = true;
				start_round(socket.room);
			}
			else io.to(socket.id).emit('message', 'SYSTEM: Sorry, you need at least 3 players to start a game.');
		}
	});
	
	socket.on('action', (content) => {
		var current_room = io.sockets.adapter.rooms[socket.room];
		//When the judge chooses their favorite response, give the submitter a point, select the next judge in the queue, and start the next round.
		if (!socket.played && socket.id == current_room.judge[0]) {
			socket.played = true;
			for (var clientID in current_room.sockets) {
				var clientSocket = io.sockets.connected[clientID];
				if (clientSocket.name == content.name) {
					clientSocket.score += 1;
					player_update(socket.room);
				}
			}
			//Give the current judge their regular deck back.
			io.to(current_room.judge[0]).emit('clear_deck', current_room.judge_options);
			io.to(current_room.judge[0]).emit('create_deck', socket.deck);
			//Move the current judge to the back of the queue and start a new round with a new judge.
			current_room.judge.shift();
			current_room.judge.push(socket.id);
			if (current_room.length < 3) {
				io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + content.name + ' won the round! Since there are currently fewer than 3 players, the game must now end.');
				declare_winner(socket.room);
			}
			else if (current_room.black_cards.length == 0) {
				io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + content.name + ' won the round! All Black Cards have been played, and the game is now ending.');
				declare_winner(socket.room);
			}
			else {
				io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + content.name + ' won the round! ' + io.sockets.connected[current_room.judge[0]].name + ' is the next judge.');
				start_round(socket.room);
			}
		}
		//When a player submits their response, add it to the list of responses for the judge. When all responses are collected, send them to the judge.
		else if (!socket.played && current_room.playing) {
			socket.played = true;
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' played their card.');
			socket.response = content;
			current_room.responses += 1;
			
			var played_pos = current_room.player_status.findIndex(x => x.name == socket.name);
			current_room.player_status[played_pos].played = true;
			io.sockets.in(socket.room).emit('create_gameview', current_room.round_info, current_room.player_status);
			
			//Remove the played card from the player's deck and give them a new one.
			socket.emit('clear_deck', [socket.response]);
			var pos = socket.deck.findIndex(x => x.response === content.response);
			socket.deck.splice(pos,1);
			if (current_room.white_cards.length > 0)  {
				var rand = Math.floor(Math.random() * current_room.white_cards.length);
				socket.deck.push({name:socket.name, response:current_room.white_cards[rand]});
				current_room.white_cards.splice(rand,1);
				socket.emit('create_deck', socket.deck);
			}
			
			if (current_room.responses >= current_room.length-1 && !current_room.all_submitted) {
				current_room.all_submitted = true;
				io.sockets.in(socket.room).emit('message', 'SYSTEM: All responses received! ' + io.sockets.connected[current_room.judge[0]].name + ' is now selecting their favorite response.');
				for (var clientID in current_room.sockets) {
					var clientSocket = io.sockets.connected[clientID];
					if (clientSocket.id != current_room.judge[0]) current_room.judge_options.push(clientSocket.response);
				}
				io.to(current_room.judge[0]).emit('create_deck', current_room.judge_options);
			}
		}
	});
	
	//Let the room know when a player is leaving. Remove the client from the room list.
	socket.on('disconnect', function() {
		console.log('A player has disconnected.');
		if (socket.name != null && io.sockets.adapter.rooms[socket.room] != null) {
			var current_room = io.sockets.adapter.rooms[socket.room];
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' has left the room.');
			var returned_cards = [];
			for (let i = 0; i < socket.deck.length; i++) {
				returned_cards.push(socket.deck[i].response);
			}
			current_room.white_cards = io.sockets.adapter.rooms[socket.room].white_cards.concat(returned_cards);
			current_room.judge.splice(current_room.judge.indexOf(socket.id),1);
			
			var pos = current_room.player_status.findIndex(x => x.name == socket.name);
			current_room.player_status.splice(pos,1);
			io.sockets.in(socket.room).emit('create_gameview', current_room.round_info, current_room.player_status);
			
			if (current_room.responses >= current_room.length-1) {
				if (!current_room.all_submitted) {
					current_room.all_submitted = true;
					io.sockets.in(socket.room).emit('message', 'SYSTEM: All responses received! ' + io.sockets.connected[current_room.judge[0]].name + ' is now selecting their favorite response.');
					for (var clientID in current_room.sockets) {
						var clientSocket = io.sockets.connected[clientID];
						if (clientSocket.id != current_room.judge[0]) current_room.judge_options.push(clientSocket.response);
					}
					io.to(current_room.judge[0]).emit('create_deck', current_room.judge_options);
				}
				else {
					io.to(current_room.judge[0]).emit('clear_deck', current_room.judge_options);
					pos = current_room.judge_options.findIndex(x => x.name == socket.name);
					current_room.judge_options.splice(pos,1);
					io.to(current_room.judge[0]).emit('create_deck', current_room.judge_options);					
				}
			}
			
			if (current_room.length == 1) {
				io.sockets.in(socket.room).emit('message', 'SYSTEM: All other players have left the room. The game is now ending.');
				declare_winner(socket.room);
			}
			
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