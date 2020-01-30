//Create new <li> element in #chat-history to represent chat with given text.
const writeChat = (text) => {
	const parent = document.querySelector('#chat-history');
	const new_li = document.createElement('li');
	new_li.innerHTML = text;
	parent.appendChild(new_li);
};

//Take text from #chat and submit it to server to send to everyone.
const onChatSubmitted = (event) => {
	event.preventDefault();
	const input = document.querySelector('#chat');
	const text = input.value;
	input.value = '';
	
	socket.emit('message', text);
};

//Default message upon first joining.
writeChat('Hello, welcome to Cards Against the Internet!');

//When receiving a message from the server, do writeChat function.
//Send keyword 'message' so the server knows it is a chat message.
const socket = io();
socket.on('message', (text) => {
	writeChat(text);
});

//When button in #chat-form is pressed, do onChatSubmitted function.
document.querySelector('#chat-form').addEventListener('submit', onChatSubmitted);