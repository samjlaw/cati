//Testing early prototypes of black and white cards.
import BlackCard from '/src/blackcard.js';
import WhiteCard from '/src/whitecard.js';

var my_black_card = new BlackCard('Sam wants', 'every day.');

var cards = [];
cards[0] = new WhiteCard('Cards Against Humanity');
cards[1] = new WhiteCard('Apples to Apples');
cards[2] = new WhiteCard('Computer Science');
cards[3] = new WhiteCard('Cold winter weather in Iowa');
cards[4] = new WhiteCard('Socket.IO');

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
	if (socket.name != null) socket.emit('action', cards[i].contents());
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

//Default message upon first joining.
writeChat('SYSTEM: Hello, welcome to Cards Against the Internet!');
writeChat('SYSTEM: Please enter your name in chat before starting.')

//Event Listeners.
document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted);

document.querySelector('#c1').textContent = 'Card 1';
document.querySelector('#c2').textContent = 'Card 2';
document.querySelector('#c3').textContent = 'Card 3';
document.querySelector('#c4').textContent = 'Card 4';
document.querySelector('#c5').textContent = 'Card 5';

document.querySelector('#c1').addEventListener('click', onCardSubmitted);
document.querySelector('#c2').addEventListener('click', onCardSubmitted);
document.querySelector('#c3').addEventListener('click', onCardSubmitted);
document.querySelector('#c4').addEventListener('click', onCardSubmitted);
document.querySelector('#c5').addEventListener('click', onCardSubmitted);