//Player's current deck.
var my_cards = [];

//Cards that are available to the player once they use one in their deck.
var available_cards = [];

//Blackcard cue and player names stored locally for resizing purposes.
var players = [];
var round_prompt = [];
var winner_name = '';
var game_over = false;
var view_title = true;

//Canvas context for drawing graphics.
var canvas = document.querySelector('#card-screen');
canvas.width = canvas.parentNode.clientWidth;
canvas.height = canvas.parentNode.clientHeight;
var c = canvas.getContext('2d');

//Create new <li> element in #chat-history to represent chat with given text.
const write_chat = (text) => {
	const parent = document.querySelector('#chat-history');
	const new_li = document.createElement('li');
	new_li.textContent = text;
	parent.appendChild(new_li);
};

//Take text from #chat and submit it to server to send to everyone.
const on_chat_submitted = (event) => {
	event.preventDefault();
	const input = document.querySelector('#chat');
	const text = input.value;
	input.value = '';
	if (socket.room == null) {
		socket.emit('room_set', text);
	}
	else if (socket.name == null) {
		socket.emit('name_set', text);
	}
	else {
		socket.emit('message', text);
	}
};

//Submit the selected card to the server, if the player has entered a name.
const on_card_submitted = (event) => {
	event.preventDefault();
	var id = event.target.id;
	var i;
	switch (id) {
		case 'c1':
			i = 0;
			break;
		case 'c2':
			i = 1;
			break;
		case 'c3':
			i = 2;
			break;
		case 'c4':
			i = 3;
			break;
		case 'c5':
			i = 4;
			break;
	}
	if (my_cards[i] != null) socket.emit('action', my_cards[i]);
};

//Start the game if the player is the host.
const start_game = (event) => {
	event.preventDefault();
	socket.emit('start_game');
};

const leave_game = (event) => {
	event.preventDefault();
	socket.emit('leave_room');
	document.querySelector('#start').style.visibility = 'hidden';
	document.querySelector('#leave').style.visibility = 'hidden';
	socket.room = null;
	socket.name = null;
	const title = document.querySelector('#leaderboard-title');
	title.textContent = ''
};

//Wrap text so the black cards can have multiple lines.
function wrap_text(txt, x, y, max_width, line_height) {
	var words = txt.split(' ');
	var line = '';
	
	for(var i = 0; i < words.length; i++) {
		var new_line = line + words[i] + ' ';
		var line_width = c.measureText(new_line).width;
		if (line_width > max_width && i > 0) {
			c.fillText(line, x, y);
			line = words[i] + ' ';
			y += line_height;
		}
		else {
			line = new_line;
		}
	}
	c.fillText(line, x, y);
}

//Render the title screen when the player first joins.
function display_title_screen() {
	//Card
	c.fillStyle = 'black';
	c.fillRect(canvas.width/2-canvas.width/10, canvas.height/2-canvas.height*.4, canvas.width/5, canvas.height/2);
	//Welcome message
	c.font = (canvas.width*1.5/100) + 'px Arial';
	c.fillStyle = 'white';
	wrap_text('Welcome to this _____ game!', canvas.width/2-canvas.width/10+canvas.width/200, canvas.height/2-canvas.height*.35, canvas.width/5, canvas.width*1.5/80);
	//Logo
	c.font = (canvas.width/100) + 'px Arial';
	c.fillText('Cards Against the Internet', canvas.width/2-canvas.width/10+canvas.width/200, canvas.height/2+canvas.height/12);
}

//Render Black Card, List of players, and their submission status.
function create_game_view(current_prompt, player_status) {
	//Card
	c.fillStyle = 'black';
	c.fillRect(canvas.width/2-canvas.width/10, canvas.height/2-canvas.height*.4, canvas.width/5, canvas.height/2);
	//Cue
	c.font = (canvas.width*1.5/100) + 'px Arial';
	c.fillStyle = 'white';
	wrap_text(current_prompt.cue, canvas.width/2-canvas.width/10+canvas.width/200, canvas.height/2-canvas.height*.35, canvas.width/5, canvas.width*1.5/80);
	//Logo
	c.font = (canvas.width/100) + 'px Arial';
	c.fillText('Cards Against the Internet', canvas.width/2-canvas.width/10+canvas.width/200, canvas.height/2+canvas.height/12);
	//Judge Name
	c.font = (canvas.width/100 * 2) + 'px Arial';
	c.fillStyle = 'black';
	var judge_txt = 'Judge - ' + current_prompt.judge;
	c.fillText(judge_txt, canvas.width/2 - c.measureText(judge_txt).width/2, canvas.height/15);
	
	//Player Status and Names
	for (let i = 0; i < player_status.length; i++) {
		//Status
		var color = 'red';
		var outline = '#330000';
		if (player_status[i].played) {
			color = 'green';
			outline = '#003300';
		}
		c.beginPath();
		c.moveTo(canvas.width/6 * (i+1), canvas.height/15*13);
		c.arc(canvas.width/6 * (i+1), canvas.height/15*13, canvas.width/60, 0, 2*Math.PI);
		c.fillStyle = color;
		c.lineWidth = 5;
		c.strokeStyle = outline;
		c.stroke();
		c.fill();
		c.closePath();
		
		//Player Name
		c.font = (canvas.width/100 * 2) + 'px Arial';
		c.fillStyle = 'black';
		c.fillText(player_status[i].name, canvas.width/6*(i+1) - c.measureText(player_status[i].name).width/2, canvas.height/15*12);
	}
}

//Display a message once the game has ended and the winner is decided.
function display_winner(name) {
	c.font = (canvas.width/100 * 5) + 'px Arial';
	c.fillStyle = 'black';
	var winner_txt = name + ' is the winner!!!';
	c.fillText(winner_txt, canvas.width/2 - c.measureText(winner_txt).width/2, canvas.height/2);
}

//Create a deck of cards based on what is sent to the player from the server.
function create_deck(available_cards) {
	for (let i = 0; i < available_cards.length; i++) {
		my_cards[i] = available_cards[i];
		document.querySelector('#c'+(i+1)).textContent = my_cards[i].response;
		document.querySelector('#c'+(i+1)).style.visibility = 'visible';
	}
}

//When receiving a message from the server, do write_chat function.
const socket = io.connect();

//Add chat message to chat history.
socket.on('message', (text) => {
	write_chat(text);
});

//Set the player's name locally if it is allowed by the server.
socket.on('name_set', (name) => {
	socket.name = name;
});

//Set the player's room, and label the top of the leaderboard appropriately.
socket.on('room_set', (room) => {
	socket.room = room;
	const title = document.querySelector('#leaderboard-title');
	title.textContent = 'Players - Room: ' + room;
});

//Set the player's deck when they first join.
socket.on('create_deck', (available_cards) => {
	create_deck(available_cards);
});

//Remove card from player's deck after they play it, and remove options from the judge after they pick their favorite.
socket.on('clear_deck', (cards) => {
	document.querySelector('#c1').style.visibility = 'hidden';
	document.querySelector('#c2').style.visibility = 'hidden';
	document.querySelector('#c3').style.visibility = 'hidden';
	document.querySelector('#c4').style.visibility = 'hidden';
	document.querySelector('#c5').style.visibility = 'hidden';
	for (let i = 0; i < cards.length; i++) {
		var pos = my_cards.findIndex(x => x.response === cards[i].response);
		my_cards.splice(pos,1);
	}
	create_deck(my_cards);
});

//Display the title screen.
socket.on('title_screen', () => {
	view_title = true;
	c.clearRect(0, 0, canvas.width, canvas.height);
	canvas.width = canvas.parentNode.clientWidth;
	canvas.height = canvas.parentNode.clientHeight;
	display_title_screen();
});

//Clear the canvas and redraw it whenever the canvas needs to be updated.
socket.on('create_gameview', (current_prompt, player_status) => {
	view_title = false;
	c.clearRect(0, 0, canvas.width, canvas.height);
	canvas.width = canvas.parentNode.clientWidth;
	canvas.height = canvas.parentNode.clientHeight;
	create_game_view(current_prompt, player_status);
	round_prompt = current_prompt;
	players = player_status;
});

//Clear the canvas and display the winner message.
socket.on('display_winner', (name) => {
	game_over = true;
	c.clearRect(0, 0, canvas.width, canvas.height);
	canvas.width = canvas.parentNode.clientWidth;
	canvas.height = canvas.parentNode.clientHeight;
	display_winner(name);
	winner_name = name;
});

//Update the list of player names when the player list is updated.
socket.on('player_update', (clients) => {
	const parent = document.querySelector('#leaderboard');
	while (parent.firstChild) {
		parent.removeChild(parent.firstChild);
	}
	for (let i = 0; i < clients.length; i++) {
		const new_li = document.createElement('li');
		new_li.textContent = clients[i];
		parent.appendChild(new_li);
	}
});

socket.on('show_start_button', () => {
	document.querySelector('#start').style.visibility = 'visible';
});

socket.on('hide_start_button', () => {
	document.querySelector('#start').style.visibility = 'hidden';
});

socket.on('show_leave_button', () => {
	document.querySelector('#leave').style.visibility = 'visible';
});

//Default message upon first joining.
write_chat('SYSTEM: Hello, welcome to Cards Against the Internet!');
write_chat('SYSTEM: Please enter a 4-character room code. You may join an existing room or create your own.')

//Event Listeners.
document.querySelector('#chat-form').addEventListener('submit', on_chat_submitted);

document.querySelector('#c1').addEventListener('click', on_card_submitted);
document.querySelector('#c2').addEventListener('click', on_card_submitted);
document.querySelector('#c3').addEventListener('click', on_card_submitted);
document.querySelector('#c4').addEventListener('click', on_card_submitted);
document.querySelector('#c5').addEventListener('click', on_card_submitted);

document.querySelector('#start').addEventListener('click', start_game);
document.querySelector('#leave').addEventListener('click', leave_game);

//Resive Canvas when window changes size.
window.addEventListener("resize", resizeCanvas, false);
function resizeCanvas(e) {
	if (view_title) {
		canvas.width = canvas.parentNode.clientWidth;
		canvas.height = canvas.parentNode.clientHeight;
		display_title_screen();
	}
	else if (!game_over) {
		canvas.width = canvas.parentNode.clientWidth;
		canvas.height = canvas.parentNode.clientHeight;
		if (round_prompt.judge != null && round_prompt.cue != '') {
			create_game_view(round_prompt, players);
		}
	}
	else {
		canvas.width = canvas.parentNode.clientWidth;
		canvas.height = canvas.parentNode.clientHeight;
		if (winner_name != '') {
			display_winner(winner_name);
		}
	}
}