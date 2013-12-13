Camera = function(x,y,zoom) {
    this.x = x //center of the camera view
    this.y = y
    this.zoomFactor = 1
    this.zoomLevel = 0
    this.panning = false
}

Camera.prototype.moveTo = function(x,y) {
    this.x = x
    this.y = y
    this.updateObjects()
}

Camera.prototype.moveBy = function(x,y) {
    this.moveTo(this.x + x/this.zoomFactor, this.y + y/this.zoomFactor)
}

Camera.prototype.updateObjects = function() {
    //update the positions of all elements depending on the new camera position/zoom
    //only the gameBoard is shifted about and rescaled
    //this usage of zoomFactor implies, that zoom 2 is a zoom IN, 0.5 would be a zoom OUT (stuff gets smaller)
    if (gameBoard) {
        var boardPos = this.worldToScreen(0,0) //assumes the board is alwas on 0,0 (left upper corner)
        gameBoard.node.css("left", boardPos[0])
        gameBoard.node.css("top", boardPos[1])
        setScale(gameBoard.node, this.zoomFactor)
    }
}

Camera.prototype.zoom = function(zoomFactor) {
    this.zoomFactor = zoomFactor
    this.updateObjects()
}

// corresponds to zooming in/out by discrete steps (maybe from mousewheel movement deltas)
Camera.prototype.zoomStep = function(zoomDelta) { //how many steps in or out
    //TODO: mind the zoom or assume that it is not manipulated anywhere else?
    this.zoomLevel += zoomDelta
    //clamp min zoom, max zoom
    this.zoomFactor = Math.pow(ZOOM_STEP,this.zoomLevel) //TODO: vary the initial zoom?
    this.updateObjects()
}

// the position of the upper left corner in world coordinates
Camera.prototype.getWorldScreenCorner = function() {
    var wX = this.x - (VIEW_WIDTH/(2*this.zoomFactor)) //top left corner
    var wY = this.y - (VIEW_HEIGHT/(2*this.zoomFactor))
    return [wX,wY]
}

Camera.prototype.screenToWorld = function(x,y) {
    cornerPos = this.getWorldScreenCorner()
    var wX = cornerPos[0] + x/this.zoomFactor
    var wY = cornerPos[1] + y/this.zoomFactor

    return [wX,wY]
}

Camera.prototype.worldToScreen = function(x,y) {
    cornerPos = this.getWorldScreenCorner()
    var sX = (x - cornerPos[0]) * this.zoomFactor
    var sY = (y - cornerPos[1]) * this.zoomFactor

    return [sX,sY]
}

Camera.prototype.startPanning = function(x,y) {
    this.panning = true
    this.panX = x
    this.panY = y
}

Camera.prototype.stopPanning = function(x,y) {
    this.panning = false
    this.panX = undefined
    this.panY = undefined
}

Camera.prototype.isPanning = function() {
    return this.panning
}

Camera.prototype.updatePan = function(x,y) {
    this.moveBy(this.panX - x, this.panY - y)
    this.panX = x
    this.panY = y
}

// positioned on (0,0)
Board = function(w,h,maxPlayers) {
    this.width = w
    this.height = h
    this.maxPlayers = maxPlayers
}

Board.prototype.create = function() {
    this.node = $('<div id="gameBoard"></div>')
    this.node.css("width",this.width)
    this.node.css("height",this.height)
    //this.node.draggable({start: onStartDragBoard, drag: onMoveDragBoard, stop: onStopDragBoard})
}

/*
Board.prototype.rel2abs = function(x, y, cardw, cardh) {
    // Convert x,y from relative (0-1) to absolute (0-boardsize) coordinates
    // but also respect the card sizes so as not to go out of the game board.
    var radius = Math.sqrt(cardw*cardw + cardh*cardh)
    absx = x * (this.width-radius) + radius/2
    absy = y * (this.height-radius) + radius/2
    return [absx, absy]
}

Board.prototype.abs2rel = function(x, y, cardw, cardh) {
    // Opposite of rel2abs, duh.
    var radius = Math.sqrt(cardw*cardw + cardh*cardh)
    relx = (x-radius/2) / (this.width-radius)
    rely = (y-radius/2) / (this.height-radius)
    return [relx, rely]
}
*/
