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
	//TODO: set z-index higher so it is on top
}
function onMoveDragCard() {
}
function onStopDragCard() {
	//TODO: tell the server about the new position, correct if out of the board?
	// server decides what is too far... and sets stuff back on need

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

var gameBoard, gameCards;
function init() {
	gameCards = []
}

function Board(w,h) {
	this.width = w
	this.height = h

	this.create = function() {
		this.node = $('<div id="gameBoard"></div>')
		this.node.css("width",this.width)
		this.node.css("height",this.height)
		this.node.draggable({start: onStartDragBoard, drag: onMoveDragBoard, stop: onStopDragBoard})
	}
}

function createBoard(width,height) {
	gameBoard = new Board(width,height)
	gameBoard.create()
	$('body').append(gameBoard.node)
}

function Card(cardId,type,x,y,w,h) {
	this.cardId = cardId
	this.type = type
	this.x = x //TODO: x and y are not kept current at the moment
	this.y = y
	this.width = w
	this.height = h

	this.create = function() {
		this.node = $('<div id="card_'+this.cardId+'" class="gameCard"><img></img></div>')

		this.node.css("top", this.y)
		this.node.css("left", this.x)
		this.node.css("z-index", this.cardId)

		this.node.css("width", this.width)
		this.node.css("height", this.height)
		//this.node.css("margin-top", -this.height/2)
		//this.node.css("margin-left", -this.width/2)
		this.node.draggable({distance: DRAG_INERTIA, start: onStartDragCard, drag: onMoveDragCard, stop: onStopDragCard})
		//										 zIndex: this.cardId, preventCollision: false }) //this does not allow for overlapping

		var cardId = this.cardId
		this.node.click(function() { console.log("r! CLICK! Id:"+cardId) }) //TODO
	}
}

function createCards(cardCount) {
	//var defaultCardX = gameBoard.width/2
	//var defaultCardY = gameBoard.height/2
	var defaultCardX = 0
	var defaultCardY = 0

	for (var i = 0; i < cardCount; i++) {
		card = new Card(i,-1,defaultCardX,defaultCardY,100,100)
		card.create()
		//TODO: set default initial position(center?)
 		gameBoard.node.append(card.node)

		gameCards.push(card)
	}
}


