export default function WhiteCard(response) {
	const card = {};
	card.response = response;
	
	card.contents = function() {
		return (response);
	}
	
	return card;
}