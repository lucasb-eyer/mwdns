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
	this.name = "Armor"

	this.isTileMap = true
	//only relevant for tileMaps
	this.imgCountX = 5
	this.imgCountY = 5
	this.tileSize = 50
	this.fileName = "flare_armor.png"
	this.path = getAssetPath(this.fileName)
	//TODO: handle lists of single images?

	this.count = 24

	this.load = function() {
		if (this.isTileMap) {
			this.sourceImage = new Image()
			this.sourceImage.src = this.path	

			this.images = []
			this.tilePosMap = {}
			for (var i = 1; i < 25; i++) {
				this.tilePosMap[(i-1)] = [i%this.imgCountX,Math.floor(i/this.imgCountY)]
			}
		}
	}

	this.drawImg = function(id, ctx,x,y,w,h) {
		if (this.isTileMap) {
			var pos = this.tilePosMap[id]
			ctx.drawImage(this.sourceImage, pos[0]*this.tileSize, pos[1]*this.tileSize, this.tileSize, this.tileSize, x,y,w,h)
		}
	}
	this.load()
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

