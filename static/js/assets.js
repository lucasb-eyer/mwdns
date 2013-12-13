var cardTypeDefinitions //has to be loaded

var assetPrefix
var deckFaceTemplate
var deckFaceImg // what pattern to put on the backside of cards

function initAssets() {
    //load card information
    $.ajax({
        dataType: "json",
        url: "/static/data/cards.json",
        data: {},
        async: false, //slooow dooown
        success: function( data ) {
            cardTypeDefinitions = data; //global variable
        }
    }).fail(function() {
            //TODO: log error?
            console.error("Request to load card information failed!")
        });

    assetPrefix = cardTypeDefinitions.assetPrefix

    //this one is a leftover from the canvas rendering version, no image is needed anymore
    deckFaceImg = new Image()
    deckFaceImg.src = cardTypeDefinitions.deckImages[0] //TODO: might want to take a different deck image (first currently)
    //maybe some preloading happens here, which would be rad... and useless

    deckFaceTemplate = $('<div>').addClass("deckFace").css("background-image","url("+deckFaceImg.src+")")
}
function getAssetPath(file) {
    return assetPrefix+file
}

ImageSourceColorRandom = function(width,height, typeCount) {
    this.width = width
    this.height = height
    this.typeCount = typeCount
    this.init()
}

ImageSourceColorRandom.prototype.init = function() {
    this.images = []
    this.colors = randomDistinctiveHappyColors(this.typeCount)

     for (var i = 0; i < this.typeCount; i++) {
        var img = $('<img src="static/img/transparent.gif">').css("background-color",this.colors[i])
        this.images.push(img)
    }
}

ImageSourceColorRandom.prototype.getElement = function(type) {
    //TODO: error handling, watch that the images element is not empty or anything
    return this.images[parseInt(type)].clone() //TODO: trying to do this without expecting errors causes the white-borderless-card syndrome
    //look below for similar error sources
}

//TODO: generalized tile map image processor instead of this one
function ImageSourceTileMap(cardInformation) {
    this.name = "TileMap: " + cardInformation.name

    //only relevant for tileMaps
    this.imgCountX = cardInformation.imgCountX
    this.imgCountY = cardInformation.imgCountY

    this.cardSizeX = cardInformation.cardSizeX
    this.cardSizeY = cardInformation.cardSizeY
    this.tileSizeX = cardInformation.tileSizeX
    this.tileSizeY = cardInformation.tileSizeY

    this.fileName = cardInformation.fileName

    //TODO: handle lists of single images?
    this.path = getAssetPath(this.fileName)

    this.count = cardInformation.maxPairs*2

    this.init()
}

ImageSourceTileMap.prototype.init = function() {
    this.cvs = document.createElement("canvas")
    this.cvs.width = this.cardSizeX
    this.cvs.height = this.cardSizeY
    this.ctx = this.cvs.getContext("2d")
    //TODO: error checking and happy things

    this.sourceImage = new Image()
    this.sourceImage.src = this.path

    this.images = []

    // proxy so this = this object
    $(this.sourceImage).load($.proxy(function() {
        for (var i = 1; i < 25; i++) {
            var tilePos = [i%this.imgCountX,Math.floor(i/this.imgCountY)]

            //TODO: draw each tilemap image on an own img
            this.ctx.drawImage(this.sourceImage,
                tilePos[0]*this.tileSizeX, tilePos[1]*this.tileSizeY,
                this.tileSizeX, this.tileSizeY, 0,0,this.cardSizeX,this.cardSizeY)
            var img = new Image()
            img.src = this.cvs.toDataURL("image/png")
            this.images.push(img)
        }

        //TODO: redraw already visible cards (kind of hacky, prevents white boring cards (if they are already flipped open when the images are not yet loaded)
    }, this))
}

ImageSourceTileMap.prototype.getElement = function(type) {
    return $(this.images[parseInt(type)]).clone()
}
