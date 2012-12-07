var DRAG_INERTIA = 10 // pixel distance

var viewX = 0
var viewY = 0
var viewZoom = 1

function onStartDragBoard() {
}
function onMoveDragBoard() {
}
function onStopDragBoard() {
}

function onStartDragCard() {
}
function onMoveDragCard() {
}
function onStopDragCard() {
	//TODO: tell the server about the new position, correct if out of the board?
	// server decides what is too far...

	/*
	var contentStr = JSON.stringify({
		id: this.attr("cardId"),
		x: Math.floor(this.attr("x")),
		y: Math.floor(this.attr("y")),
		phi: this.rotation})
	contentStr = contentStr.replace(/"/g,"'")
	conn.send('{"moveCard": "'+contentStr+'"}');
	*/
}

function init() {
	gameBoard = $('<div id="gameBoard"></div>')
	$('body').append(gameBoard)

	//gameBoard.css("width",BoardWidth) //TODO
	gameCard = $('<div id="card_1" class="gameCard"><img src="/static/img/patterns/LOUD/1096.png"></div>')
 	gameBoard.append(gameCard)

	gameCard.draggable({distance: DRAG_INERTIA, start: onStartDragCard, drag: onMoveDragCard, stop: onStopDragCard})
	gameCard.click(function() { console.log("CLICK!") })

	gameBoard.draggable({start: onStartDragBoard, drag: onMoveDragBoard, stop: onStopDragBoard})
}

$(function() {
})
