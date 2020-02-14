export default function BlackCard(section1, section2) {
	const card = {};
	card.section1 = section1;
	card.section2 = section2;
	
	card.contents = function() {
		return (card.section1 + ' _____ ' + card.section2);
	}
	
	return card;
}