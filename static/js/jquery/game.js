var viewX = 0
var viewY = 0
var viewZoom = 1

function onStartDragBoard() {
}
function onMoveDragBoard() {
}
function onStopDragBoard() {
}

function onStartDrag(obj,e) {
	obj.isBeingClicked = true
	obj.preDragPos = [e.pageX, e.pageY]
	obj.node.css("z-index",9000)
	console.log(obj.preDragPos)
}

function onMoveDrag (obj,e) {
	// TODO: I wanted to put obj into helpers.js, but it was undefined here! What's your plan with helpers.js?
	if (obj.isBeingClicked && !obj.isBeingDragged && dist(obj.preDragPos, [e.pageX, e.pageY]) > DRAG_INERTIA) {
		// If the user is holding a mousebutton down while moving the mouse, he is dragging.
		obj.isBeingDragged = true
	}

	if (obj.isBeingDragged) {
		obj.x = e.pageX
		obj.y = e.pageY
		obj.node.css("top",obj.y)
		obj.node.css("left",obj.x)
	}
}

function onStopDrag(obj,e) {
	if (obj.isBeingDragged) {
		obj.isBeingDragged = false
		//obj._broadcastPosition()
	} else if (obj.isBeingClicked) {
		conn.send('{"wantFlip": "'+obj.cardId+'"}');
	}
	obj.isBeingClicked = false
	obj.node.css("z-index",obj.cardId)

	/*
	var contentStr = JSON.stringify({
		id: obj.attr("cardId"),
		x: Math.floor(obj.attr("x")),
		y: Math.floor(obj.attr("y")),
		phi: obj.rotation})
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
		//this.node.draggable({start: onStartDragBoard, drag: onMoveDragBoard, stop: onStopDragBoard})
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

	this.isBeingClicked = false
	this.isBeingDragged = false

	this.create = function() {
		this.node = $('<div id="card_'+this.cardId+'" class="gameCard"><img></img></div>')

		this.node.css("top", this.y)
		this.node.css("left", this.x)
		this.node.css("z-index", this.cardId)

		this.node.css("width", this.width)
		this.node.css("height", this.height)
		this.node.css("margin-top", (-this.width/2)+"px")
		this.node.css("margin-left", (-this.height/2)+"px")

		//this.node.draggable({	distance: DRAG_INERTIA, start: onStartDragCard, drag: onMoveDragCard, stop: onStopDragCard,
													//containment: "#gameBoard"})
		//										 zIndex: this.cardId, preventCollision: false }) //this does not allow for overlapping

		var obj = this
		this.node.bind("mousedown", function(e){onStartDrag(obj,e)});
		//TODO: add general on mousemove listener for whole body, or change z-index of dragged object
		this.node.bind("mousemove", function(e){onMoveDrag(obj,e)});
		this.node.bind("mouseup", function(e){onStopDrag(obj,e)});

		var cardId = this.cardId
	}
}

function createCards(cardCount) {
	var defaultCardX = gameBoard.width/2
	var defaultCardY = gameBoard.height/2

	for (var i = 0; i < cardCount; i++) {
		card = new Card(i,-1,defaultCardX,defaultCardY,100,100)
		card.create()
		//TODO: set default initial position(center?)
 		gameBoard.node.append(card.node)

		gameCards.push(card)
	}
}


