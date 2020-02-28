//Testing early prototypes of black and white cards.
import BlackCard from '/src/blackcard.js';

var my_black_card = new BlackCard('Sam wants', 'every day.');

//Player's current deck.
var my_cards = [];

//Cards that are available to the player once they use one in their deck.
var available_cards = [];

//List of names of all players currently on server.
var names = [];

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
	if (socket.name == null) {
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
	if (socket.name != null) socket.emit('action', my_cards[i]);
}

//When receiving a message from the server, do writeChat function.
const socket = io();
socket.on('message', (text) => {
	writeChat(text);
});

//Set the player's name locally if it is allowed by the server.
socket.on('name_set', (name) => {
	socket.name = name;
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
});

//Update the list of player names when the player list is updated.
socket.on('player_update', (new_names) => {
	names = new_names;
	const parent = document.querySelector('#leaderboard');
	while (parent.firstChild) {
		parent.removeChild(parent.firstChild);
	}
	for (let i = 0; i < names.length; i++) {
		const new_li = document.createElement('li');
		new_li.textContent = names[i];
		parent.appendChild(new_li);
	}
});

//Default message upon first joining.
writeChat('SYSTEM: Hello, welcome to Cards Against the Internet!');
writeChat('SYSTEM: Please enter your name in chat before starting.')

//Event Listeners.
document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted);

document.querySelector('#c1').addEventListener('click', onCardSubmitted);
document.querySelector('#c2').addEventListener('click', onCardSubmitted);
document.querySelector('#c3').addEventListener('click', onCardSubmitted);
document.querySelector('#c4').addEventListener('click', onCardSubmitted);
document.querySelector('#c5').addEventListener('click', onCardSubmitted);