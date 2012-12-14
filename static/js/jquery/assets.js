var assetPrefix = "/static/img/assets/"
function getAssetPath(file) {
	return assetPrefix+file
}

var assets = ["flare_armor.png"]
assets = assets.map(getAssetPath)

var cardSource // where to get card faces, might be called ImageSource
var deckFaceTemplate
var deckFaceImg // what pattern to put on the backside of cards

function initAssets() {
	//this one is a leftover from the canvas rendering version, no image is needed anymore
	deckFaceImg = new Image()
	deckFaceImg.src = "/static/img/patterns/subtle/vichy.png" //maybe some preloading happens here, which would be rad... and useless

	deckFaceTemplate = $('<div>').addClass("deckFace").css("background-image","url("+deckFaceImg.src+")");
	cardSource = new ImageSourceColorRandom(DEFAULT_CARD_W, DEFAULT_CARD_H, 10)
}

ImageSourceColorRandom = function(width,height, typeCount) {
	this.width = width
	this.height = height
	this.typeCount = typeCount
	this.init()
}

ImageSourceColorRandom.prototype.init = function() {
	this.images = []
 	for (var i = 0; i < this.typeCount; i++) {
		var img = $('<img>').css("background-color",randomHappyColor())
		console.log(img)
		this.images.push(img)
	}
	console.log(this.images)
}

ImageSourceColorRandom.prototype.getElement = function(type) {
	//TODO: error handling, watch that the images element is not empty or anything
	return this.images[parseInt(type)].clone()
}

function TileMapArmor() {
	this.name = "Armor"

	//only relevant for tileMaps
	this.imgCountX = 5
	this.imgCountY = 5
	this.tileSize = 50
	this.fileName = "flare_armor.png"
	this.path = getAssetPath(this.fileName)
	//TODO: handle lists of single images?

	this.count = 24

	this.init()
}

TileMapArmor.prototype.init = function() {
	var cvs = document.createElement("canvas")
	cvs.width = this.tileSize
	cvs.height = this.tileSize
	var ctx = cvs.getContext("2d")
	//TODO: error checking and happy things

	this.sourceImage = new Image()
	this.sourceImage.src = this.path

	this.images = []
	for (var i = 1; i < 25; i++) {
		var tilePos = [i%this.imgCountX,Math.floor(i/this.imgCountY)]

		//TODO: draw each tilemap image on an own img
		ctx.drawImage(this.sourceImage,
			tilePos[0]*this.tileSize, tilePos[1]*this.tileSize,
			this.tileSize, this.tileSize, 0,0,this.tileSize,this.tileSize)
		var img = new Image()
		ctx.drawImage(img,0,0)
		this.image.push(img)
	}
}

TileMapArmor.prototype.getElement = function(type) {
	return this.images[parseInt(type)].clone()
}
