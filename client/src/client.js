//Player's current deck.
var my_cards = [];

//Cards that are available to the player once they use one in their deck.
var available_cards = [];

//Blackcard cue and judge name stored locally for resizing purposes.
var blackcard_txt = '';
var judge_name = '';

var canvas = document.querySelector('#card-screen');
canvas.width = canvas.parentNode.clientWidth;
canvas.height = canvas.parentNode.clientHeight;
var c = canvas.getContext('2d');

//Create new <li> element in #chat-history to represent chat with given text.
const writeChat = (text) => {
	const parent = document.querySelector('#chat-history');
	const new_li = document.createElement('li');
	new_li.textContent = text;
	parent.appendChild(new_li);
};

//Take text from #chat and submit it to server to send to everyone.
const onChatSubmitted = (event) => {
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
	else if (text == '!start') {
		socket.emit('start_game', text);
	}
	else {
		socket.emit('message', text);
	}
};

//Submit the selected card to the server, if the player has entered a name.
const onCardSubmitted = (event) => {
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
}

function createBlackCard(text, name) {
	//Card
	c.fillRect(canvas.width/2-canvas.width/10, canvas.height/2-canvas.height*.4, canvas.width/5, canvas.height/2);
	//Cue
	c.font = (canvas.width/100 * 1.5) + 'px Arial';
	c.fillStyle = 'white';
	c.textAlign = 'center';
	c.fillText(text, canvas.width/2, canvas.height/2-100)
	//Logo
	c.font = (canvas.width/100) + 'px Arial';
	c.fillText('Cards Against the Internet', canvas.width/2-canvas.width/30, canvas.height/2+canvas.height/12);
	//Judge Name
	c.font = (canvas.width/100 * 2) + 'px Arial';
	c.fillStyle = 'black';
	c.textAlign = 'center';
	c.fillText('Judge - ' + name, canvas.width/2, canvas.height/15)
}

//When receiving a message from the server, do writeChat function.
const socket = io.connect();

socket.on('message', (text) => {
	writeChat(text);
});

//Set the player's name locally if it is allowed by the server.
socket.on('name_set', (name) => {
	console.log(socket.name);
	socket.name = name;
});

socket.on('room_set', (room) => {
	socket.room = room;
	const title = document.querySelector('#leaderboard-title');
	title.textContent = 'Players - Room: ' + room;
});

//Set the player's deck when they first join.
socket.on('create_deck', (available_cards) => {
	for (let i = 0; i < available_cards.length; i++) {
		my_cards[i] = available_cards[i];
		document.querySelector('#c'+(i+1)).textContent = my_cards[i].response;
		document.querySelector('#c'+(i+1)).style.visibility = 'visible';
	}
});

socket.on('create_blackcard', (current_prompt) => {
	c.clearRect(0, 0, canvas.width, canvas.height);
	canvas.width = canvas.parentNode.clientWidth;
	canvas.height = canvas.parentNode.clientHeight;
	createBlackCard(current_prompt.cue, current_prompt.judge);
	blackcard_txt = current_prompt.cue;
	judge_name = current_prompt.judge;
});

//Update the list of player names when the player list is updated.
socket.on('player_update', (clients) => {
	console.log(clients);
	const parent = document.querySelector('#leaderboard');
	while (parent.firstChild) {
		parent.removeChild(parent.firstChild);
	}
	for (let i = 0; i < clients.length; i++) {
		console.log(clients[i]);
		const new_li = document.createElement('li');
		new_li.textContent = clients[i];
		parent.appendChild(new_li);
	}
});

//Default message upon first joining.
writeChat('SYSTEM: Hello, welcome to Cards Against the Internet!');
writeChat('SYSTEM: Please enter a 4-character room code. You may join an existing room or create your own.')

//Event Listeners.
document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted);

document.querySelector('#c1').addEventListener('click', onCardSubmitted);
document.querySelector('#c2').addEventListener('click', onCardSubmitted);
document.querySelector('#c3').addEventListener('click', onCardSubmitted);
document.querySelector('#c4').addEventListener('click', onCardSubmitted);
document.querySelector('#c5').addEventListener('click', onCardSubmitted);

//Resive Canvas when window changes size
window.addEventListener("resize", resizeCanvas, false);
function resizeCanvas(e) {
	canvas.width = canvas.parentNode.clientWidth;
	canvas.height = canvas.parentNode.clientHeight;
	if (socket.name != null && blackcard_txt != '') {
		createBlackCard(blackcard_txt, judge_name);
	}
}