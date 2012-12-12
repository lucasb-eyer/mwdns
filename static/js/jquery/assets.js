var assetPrefix = "/static/img/assets/"
function getAssetPath(file) {
	return assetPrefix+file
}

var assets = ["flare_armor.png"]
assets = assets.map(getAssetPath)

var cardSource
var deckFaceImg

function initAssets() {
	deckFaceImg = new Image()
	deckFaceImg.src = "/static/img/patterns/subtle/vichy.png"

	cardSource = new ImageSourceColorRandom(DEFAULT_CARD_W, DEFAULT_CARD_H, 10)
}

ImageSourceColorRandom = function(width,height, typeCount) {
	this.width = width
	this.height = height
	this.typeCount = typeCount
}

TileMapArmor.prototype.init = function() {
 //TODO
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

