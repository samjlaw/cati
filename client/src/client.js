//Player's current deck.
var my_cards = [];

//Cards that are available to the player once they use one in their deck.
var available_cards = [];

//List of names of all players currently on server and their scores.
var names = [];
var scores = [];
var current_prompt = 'I go to _____ class.';

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
		socket.emit('room', text);
	}
	else if (socket.name == null) {
		socket.emit('name_set', text);
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
	if (socket.name != null && my_cards[i] != null) socket.emit('action', my_cards[i]);
}

const createBlackCard = (text) => {
	c.fillRect(canvas.width/2-canvas.width/10, canvas.height/2-canvas.height*.4, canvas.width/5, canvas.height/2);
	c.font = (canvas.width/100 * 1.5) + 'px Arial';
	c.fillStyle = 'white';
	c.textAlign = 'center';
	c.fillText(text, canvas.width/2, canvas.height/2-100)
	c.font = (canvas.width/100) + 'px Arial';
	c.fillText('Cards Against the Internet', canvas.width/2-canvas.width/30, canvas.height/2+canvas.height/12);
}

//When receiving a message from the server, do writeChat function.
const socket = io.connect();

socket.on('message', (text) => {
	writeChat(text);
});

//Set the player's name locally if it is allowed by the server.
socket.on('name_set', (name) => {
	socket.name = name;
});

socket.on('room_set', (room) => {
	socket.room = room;
	const title = document.querySelector('#leaderboard-title');
	title.textContent = 'Players - Room: ' + room;
});

//Set the player's deck when they first join.
socket.on('create_deck', (available_cards) => {
	my_cards[0] = available_cards[0];
	my_cards[1] = available_cards[1];
	my_cards[2] = available_cards[2];
	my_cards[3] = available_cards[3];
	my_cards[4] = available_cards[4];
	document.querySelector('#c1').textContent = my_cards[0];
	document.querySelector('#c2').textContent = my_cards[1];
	document.querySelector('#c3').textContent = my_cards[2];
	document.querySelector('#c4').textContent = my_cards[3];
	document.querySelector('#c5').textContent = my_cards[4];
	document.querySelector('#c1').style.visibility = 'visible';
	document.querySelector('#c2').style.visibility = 'visible';
	document.querySelector('#c3').style.visibility = 'visible';
	document.querySelector('#c4').style.visibility = 'visible';
	document.querySelector('#c5').style.visibility = 'visible';
	
	createBlackCard(current_prompt);
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
	if (socket.name != null) createBlackCard(current_prompt);
}