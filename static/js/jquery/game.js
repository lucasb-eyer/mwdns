var WIDTH  = 500 // default width/height of the canvas element, is reset
	, HEIGHT = 500

	// card behaviour
	, MOVEMENT_SPEED = 30 //actually is movement time
	, CARD_TURNBACK_TIMEOUT = 1000 //ms
	, DRAG_INERTIA = 15 // pixel distance

	// card look
	, CARD_PADDING = 10
	, CARD_WIDTH = 200
	, CARD_HEIGHT = 200

function Camera(x,y,zoom) {
	this.currentZoom = zoom
	this.centerX = x
	this.centerY = y
}

function Board(x,y,w,h) {
	this.x = x
	this.y = y
	this.w = w
	this.h = h
}

function Card(x,y,id) {
 	this.x = x
	this.y = y
	this.id = id
}

var camera

function init() {
	camera = new Camera(0,0,1)

	deckFaceImgSrc = "/static/img/patterns/subtle/vichy.png"
	cardSource = new TileMapArmor()
	renderCards(deckFaceImgSrc)
}

var cards = []
// create card objects
function createCards(cardCount) {
	if (cardCount > cardSource.count*2) {
		console.log("Error: I don't have so many distinct cards to show :(")
		return
	}

	//create crafty game objects
	//assumes card ids start with 0 and cover the whole range to count-1
	var x = WIDTH/2 - CARD_WIDTH/2
	  , y = HEIGHT/2 - CARD_HEIGHT/2
	for (var i=0; i<cardCount; i++)
	{
		var card = new Card(x,y,i)
		cards.push(card)
	}
}

