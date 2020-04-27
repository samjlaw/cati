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
all_white_cards[16] = '16';
all_white_cards[17] = '17';
all_white_cards[18] = '18';
all_white_cards[19] = '19';
all_white_cards[20] = '20';
all_white_cards[21] = '21';
all_white_cards[22] = '22';
all_white_cards[23] = '23';
all_white_cards[24] = '24';
all_white_cards[25] = '25';
all_white_cards[26] = '26';
all_white_cards[27] = '27';
all_white_cards[28] = '28';
all_white_cards[29] = '29';
all_white_cards[30] = '30';
all_white_cards[31] = '31';
all_white_cards[32] = '32';
all_white_cards[33] = '33';

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
			if (clientSocket.name != null) names_scores.push(clientSocket.name + ' - Score: ' + clientSocket.score);
		}
		io.sockets.in(room).emit('player_update', names_scores);
	}
}

//Get ready to start the first round of the game and set all player variables back to starting states.
function start_game(room, name, id, host) {
	var current_room = io.sockets.adapter.rooms[room];
	if (!current_room.playing && name != null && host) {
		if (current_room.length > 2) {
			console.log('Starting game in room ' + room);
			io.sockets.in(room).emit('message', 'SYSTEM: ' + name + ' is starting the game, and ' + io.sockets.connected[current_room.judge[0]].name + ' is the first judge!');
			current_room.playing = true;
			start_round(room, false);
			io.to(id).emit('hide_start_button');
			
			//Generate cards for players, and reset score for if the room aready completed a game.
			for (var clientID in current_room.sockets) {
				var clientSocket = io.sockets.connected[clientID];
				clientSocket.score = 0;
				
				//Randomly generate deck of cards for player from the list of available cards in the room.
				var remaining_cards = 5;
				if (current_room.white_cards.length < 5) remaining_cards = current_room.white_cards.length;
				for (let i = 0; i < remaining_cards; i++) {
					var rand = Math.floor(Math.random() * current_room.white_cards.length);
					clientSocket.deck[i] = {name:clientSocket.name, response:current_room.white_cards[rand]};
					current_room.white_cards.splice(rand,1);
				}
				if (clientSocket.id != current_room.judge[0]) io.to(clientSocket.id).emit('create_deck', clientSocket.deck);
			}
		}
		else io.to(id).emit('message', 'SYSTEM: Sorry, you need at least 3 players to start a game.');
	}
}

//Set the current room's response numbers to zero, clear the judge's cards and player responses from previous round, and send a black card with a new prompt.
function start_round(room, redo) {
	var current_room = io.sockets.adapter.rooms[room];
	current_room.responses = 0;
	current_room.judge_options = [];
	current_room.player_status = [];
	current_room.all_submitted = false;
	
	//Reset player statuses and clear judge's deck.
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
	
	//If a judge leaves mid-round, redo the round with the same card. If it's a new round as expected, then generate a new card.
	if (redo) current_room.round_info.judge = io.sockets.connected[current_room.judge[0]].name;
	else {
		var current_cue = Math.floor(Math.random() * current_room.black_cards.length);
		current_room.round_info = {judge:io.sockets.connected[current_room.judge[0]].name, cue:current_room.black_cards[current_cue]};
		current_room.black_cards.splice(current_cue,1);
	}
	
	io.sockets.in(room).emit('create_gameview', current_room.round_info, current_room.player_status);
}

//Once all black cards have been played, or some other circumstance causes the game to end, declare the winner.
function declare_winner(room) {
	var current_room = io.sockets.adapter.rooms[room];
	var max_score = {name:'', score:-1};
	for (var clientID in current_room.sockets) {
		var clientSocket = io.sockets.connected[clientID];
		io.to(clientSocket.id).emit('clear_deck', clientSocket.deck);
		if (clientSocket.host) {
			io.to(clientSocket.id).emit('show_start_button');
		}
		if (clientSocket.score > max_score.score) {
			max_score.name = clientSocket.name;
			max_score.score = clientSocket.score;
		}
	}
	setTimeout(function() {
		io.sockets.in(room).emit('message', 'SYSTEM: ' + max_score.name + ' is the winner of the game with ' + max_score.score + ' points!');
		io.sockets.in(room).emit('display_winner', max_score.name);
	}, 1000);
	
	//Reset cards and allow host to start a new game.
	current_room.white_cards = all_white_cards.slice();
	current_room.black_cards = all_black_cards.slice();
	current_room.playing = false;
}

//Decide what to do in the room based on the state of the current game when a player leaves the room or disconnects from the server.
function on_disconnect(room, name, id, host) {
	if (io.sockets.adapter.rooms[room] != null) {
		var current_room = io.sockets.adapter.rooms[room];
		io.sockets.in(room).emit('message', 'SYSTEM: ' + name + ' has left the room.');
		
		if (current_room.playing) {
			//Remove player's name and their submission status from the canvas if they are not the judge.
			if (id != current_room.judge[0]) {
				var pos = current_room.player_status.findIndex(x => x.name == name);
				current_room.player_status.splice(pos,1);
				io.sockets.in(room).emit('create_gameview', current_room.round_info, current_room.player_status);
			}
			
			//If the judge leaves mid-round, start a new round with a new judge.
			if (id == current_room.judge[0]) {
				io.sockets.in(room).emit('message', 'SYSTEM: ' + name + ' left while they were the judge. Starting a new round.');
				current_room.judge.shift();
				if (current_room.length < 3) {
					io.sockets.in(room).emit('message', 'SYSTEM: Since there are currently fewer than 3 players, the game must now end.');
					declare_winner(room);
				}
				else {
					io.sockets.in(room).emit('message', 'SYSTEM: ' + io.sockets.connected[current_room.judge[0]].name + ' is the next judge.');
					start_round(room, true);
				}
			}
		}
		
		//Remove player from judge queue if they weren't removed earlier.
		if (current_room.judge.indexOf(id) != -1) current_room.judge.splice(current_room.judge.indexOf(id),1);
		
		//If the player that left was the host, select the current judge to be the host, and give them the start button if the game hasn't started.
		if (host) {
			if (io.sockets.connected[current_room.judge[0]]!= null) io.sockets.connected[current_room.judge[0]].host = true;
			io.to(current_room.judge[0]).emit('message', 'SYSTEM: You are now the host of the room.');
			if (!current_room.playing) io.to(current_room.judge[0]).emit('show_start_button');
		}
		
		if (current_room.playing) {
			//If a player leaves and the game is then ready to send the cards to the judge, send the cards to the judge.
			if (current_room.responses >= current_room.length-1) {
				if (!current_room.all_submitted) {
					current_room.all_submitted = true;
					io.sockets.in(room).emit('message', 'SYSTEM: All responses received! ' + io.sockets.connected[current_room.judge[0]].name + ' is now selecting their favorite response.');
					for (var clientID in current_room.sockets) {
						var clientSocket = io.sockets.connected[clientID];
						if (clientSocket.id != current_room.judge[0]) current_room.judge_options.push(clientSocket.response);
					}
					io.to(current_room.judge[0]).emit('create_deck', current_room.judge_options);
				}
				//If the judge is already judging and a player leaves during judging, remove their card from the judge's options.
				else {
					io.to(current_room.judge[0]).emit('clear_deck', current_room.judge_options);
					pos = current_room.judge_options.findIndex(x => x.name == name);
					current_room.judge_options.splice(pos,1);
					io.to(current_room.judge[0]).emit('create_deck', current_room.judge_options);					
				}
			}
			
			//End the game immediately if there is only one player left in the server.
			if (current_room.length == 1) {
				io.sockets.in(room).emit('message', 'SYSTEM: All other players have left the room. The game is now ending.');
				declare_winner(room);
			}
		}
		
		player_update(room);
	}
}

//Receiving connection from clients (socket.emit for local, io.emit for server)
io.sockets.on('connection', (socket) => {
	//Add client to the list of clients, and let the server know a player is in.
	console.log('A player has connected');
	socket.emit('title_screen');
	
	//Have the player join a specified room if there is space for them. If they are the creator of the room, they will start as the judge and be granted special permissions.
	socket.on('room_set', (room) => {
		room = room.toUpperCase();
		if (room.length != 4 || room.includes(' ') || room.includes('	')) {
			socket.emit('message', 'SYSTEM: Please enter a valid room code.');
		}
		else {
			//If the user is the first to join a room, they become the host and the first judge.
			var current_room = io.sockets.adapter.rooms[room]
			if (current_room == null) {
				socket.join(room);
				current_room = io.sockets.adapter.rooms[room];
				
				socket.host = true;
				socket.emit('message', 'SYSTEM: You are the host of the "' + room + '" room! Enter your name and then press "Start Game" to begin the game.');
				socket.emit('show_start_button');
				socket.emit('show_leave_button');
				current_room.white_cards = all_white_cards.slice();
				current_room.black_cards = all_black_cards.slice();
				current_room.responses = [];
				current_room.judge = [];
				current_room.judge.push(socket.id);
				current_room.player_status = [];
				current_room.round_info = [];
				current_room.all_submitted = false;
				current_room.playing = false;
				
				socket.room = room;
				socket.emit('room_set', room);
			}
			else {
				if (current_room.playing) {
					socket.emit('message', 'SYSTEM: Sorry, this room already started a game. Please try another.');
				}
				else if (current_room.length > 6) {
					socket.emit('message', 'SYSTEM: Sorry, this room is full. Please try another.');
				}
				else {
					socket.room = room;
					socket.emit('message', 'SYSTEM: You are joining the "' + room + '" room. Now, please enter your name before starting.');
					socket.emit('room_set', room);
				}
			}
		}
	});
	
	//When client sets a name, check if it's available. If it is, assign them the name. Otherwise, have them do it again.
	socket.on('name_set', (name) => {
		var current_room = io.sockets.adapter.rooms[socket.room];
		
		//If there is no room for the player, do not let them in.
		if (current_room.playing) {
			socket.room = null;
			socket.emit('message', 'SYSTEM: Sorry, this room already started a game. Please try another.');
			socket.emit('leave_room');
		}
		else if (current_room.length > 6) {
			socket.room = null;
			socket.emit('message', 'SYSTEM: Sorry, this room is full. Please try another.');
			socket.emit('leave_room');
		}
		else {
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
				if (!socket.host) {
					socket.join(socket.room);
					socket.host = false;
					current_room.judge.push(socket.id);
					socket.emit('show_leave_button');
				}
				socket.name = name;
				socket.score = 0;
				socket.deck = [];
				socket.played = false;
				socket.emit('name_set', name);
				io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' has joined the room!');
				player_update(socket.room);
			}
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
	socket.on('start_game', () => {
		start_game(socket.room, socket.name, socket.id, socket.host);
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
				start_round(socket.room, false);
			}
		}
		//When a player submits their response, add it to the list of responses for the judge. When all responses are collected, send them to the judge.
		else if (!socket.played && current_room.playing) {
			socket.played = true;
			io.sockets.in(socket.room).emit('message', 'SYSTEM: ' + socket.name + ' played their card.');
			socket.response = content;
			current_room.responses += 1;
			
			//Change the player's light on the canvas from red to green.
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
			
			//If all players have submitted, send the responses to judge.
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
	
	socket.on('leave_room', () => {
		var room_code = socket.room;
		var name = socket.name;
		var id = socket.id;
		var host = socket.host;
		console.log('A player has left room ' + room_code);
		if (io.sockets.adapter.rooms[room_code] != null) {
			//Add client's cards back to list of cards.
			if (socket.deck != null) {
				var returned_cards = [];
				for (let i = 0; i < socket.deck.length; i++) {
					returned_cards.push(socket.deck[i].response);
				}
				io.sockets.adapter.rooms[room_code].white_cards = io.sockets.adapter.rooms[room_code].white_cards.concat(returned_cards);
			}
			
			//Reset all client attributes back to how they were before they joined the room, leave the room, clear their leaderboard, and allow them to join a new room.
			socket.name = null;
			socket.score = null;
			socket.deck = null;
			socket.played = null;
			socket.host = null;
			socket.room = null;
			io.to(socket.id).emit('message', 'SYSTEM: Please enter a 4-character room code. You may join an existing room or create your own.');
			io.to(socket.id).emit('player_update', []);
			io.to(socket.id).emit('title_screen');
			socket.leave(room_code);
			
			//Handle all other players.
			on_disconnect(room_code, name, id, host);
		}
	});
	
	//Let the room know when a player is leaving. Remove the client from the room list.
	socket.on('disconnect', () => {
		console.log('A player has disconnected.');
		if (io.sockets.adapter.rooms[socket.room] != null) {
			//Add client's cards back to list of cards.
			if (socket.deck != null) {
				var returned_cards = [];
				for (let i = 0; i < socket.deck.length; i++) {
					returned_cards.push(socket.deck[i].response);
				}
				io.sockets.adapter.rooms[socket.room].white_cards = io.sockets.adapter.rooms[socket.room].white_cards.concat(returned_cards);
			}
			
			//Handle game rules depending on game state.
			on_disconnect(socket.room, socket.name, socket.id, socket.host);
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