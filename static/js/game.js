//nice tutorial: http://craftyjs.com/tutorial/bananabomber/create-a-game
var WIDTH  = 500
	, HEIGHT = 500

var assetPrefix = "/static/img/assets/"
var assets = ["flare_armor.png"]
assets = assets.map(getAssetPath)

function getAssetPath(asset) {
	return assetPrefix+asset
}

function init() {
	//set game display to the full window
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	//TODO: resize handler

	//start crafty
	Crafty.init(WIDTH, HEIGHT)
	Crafty.canvas.init(); //to use a canvas instead of dom elements (slower)

	Crafty.scene("loading")
}

function TileMapArmor() {
	this.map = {}
	this.isTileMap = true
	this.name = "Armor"
	this.componentPrefix = "armor"

	this.fileName = "flare_armor.png"
	this.path = getAssetPath(this.fileName)

	this.count = 24
	this.tileSize = 64

	for (var i = 1; i < 25; i++) {
		this.map[this.componentPrefix+(i-1)] = [i%5,Math.floor(i/5)]
	}
}

//TODO: rather a map with available image sources (TileMap objects)
var cardSource
var deckFaceImg
function initAssets() {
	var ctx = Crafty.canvas.context
	deckFaceImg = new Image()
	deckFaceImg.src = "/static/img/patterns/subtle/vichy.png"

	cardSource = new TileMapArmor()
	if (cardSource.isTileMap) {
		Crafty.sprite(cardSource.cardSize, cardSource.path, cardSource.map);
	} else {
		console.log("Not a tilemap, how do I handle this one?")
	}
}

var cards = []
function createCards(cardCount) {
	if (cardCount > cardSource.count*2) {
		console.log("Error: I don't have so many distinct cards to show :(")
		return
	}

	//create crafty game objects
	//assumes card ids start with 0 and cover the whole range to count-1
	for (var i=0; i<cardCount; i++) 
	{
		var card = Crafty.e("Card")
								.makeCard(WIDTH/2,HEIGHT/2,i); //TODO: in the middle of the board, rather than the screen
		cards.push(card)
	}
}

