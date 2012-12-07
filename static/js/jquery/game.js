function init() {
	gameBoard = $('<div id="gameBoard"></div>')
	$('body').append(gameBoard)

	//gameBoard.css("width",BoardWidth) //TODO
	gameCard = $('<div id="card_1" class="gameCard"></div>')
 	gameBoard.append(gameCard)

	gameCard.draggable()
	gameBoard.draggable()
}

$(function() {
	$("#gameBoard").draggable()
	$(".gameCard").draggable()
})
