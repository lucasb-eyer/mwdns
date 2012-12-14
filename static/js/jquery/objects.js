Camera = function(x,y,zoom) {
	this.x = x //center of the camera view
	this.y = y
	this.zoomFactor = zoom
}

Camera.prototype.move = function(x,y) {
	this.x = x
	this.y = y
	this.updateObjects()
}

Camera.prototype.updateObjects = function() {
	//TODO: update the positions of all elements depending on the new camera position/zoom
	//this usage of zoomFactor implies, that zoom 2 is a zoom IN, 0.5 would be a zoom OUT (stuff gets smaller)

	// this translates screen distance to world distance
	// the coordinates of the screen upper left corner in the world
	//var cornerX = this.x - (VIEW_WIDTH/(2*this.zoomFactor))
	//var cornerY = this.y - (VIEW_HEIGHT/(2*this.zoomFactor))

	if (gameBoard) {
		var boardPos = this.worldToScreen(0,0) //assumes the board is alwas on 0,0 (left upper corner)
		gameBoard.node.css("left", 	boardPos[0])
		gameBoard.node.css("top", 	boardPos[1])
		setScale(gameBoard.node, this.zoomFactor)
	}

	// this is plain wrong
	//gameBoard.css("width", gameBoard.width*this.zoomFactor)
	//gameBoard.css("height", gameBoard.height*this.zoomFactor)

	/*
	for (var i in gameCards) {
		var card = gameCards[i]
		//setScale(card.node, this.zoomFactor)

		// this is plain wrong
		//card.css("top", -cornerY + card.x*this.zoomFactor)
		//card.css("left", -cornerX + card.y*this.zoomFactor)
		//card.css("width", card.width*this.zoomFactor)
		//card.css("height", card.height*this.zoomFactor)
	}
	*/
}

Camera.prototype.zoom = function(zoomFactor) {
	this.zoomFactor = zoomFactor
	this.updateObjects()
}

//TODO: use
// corresponds to zooming in/out by discrete steps (maybe from mousewheel movement deltas)
Camera.prototype.zoomStep = function(zoomStep) { //how many steps in or out
	//TODO: mind the zoom factor, zoomStep changes etc
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

// positioned on (0,0)
Board = function(w,h) {
	this.width = w
	this.height = h
}

Board.prototype.create = function() {
	this.node = $('<div id="gameBoard"></div>')
	this.node.css("width",this.width)
	this.node.css("height",this.height)
	//this.node.draggable({start: onStartDragBoard, drag: onMoveDragBoard, stop: onStopDragBoard})
}

Card = function(cardId,type,x,y,w,h) {
	this.cardId = cardId
	this.type = type
	this.x = x //TODO: x and y are not kept current at the moment
	this.y = y
	this.width = w
	this.height = h

	this.isBeingClicked = false
	this.isBeingDragged = false

	//has to be created in here instead of the create method... I wonder why TODO
	this.node = $('<div id="card_'+this.cardId+'" class="gameCard"><img></img></div>')
}

Card.prototype.create = function() {
	this.node.css("top", this.y)
	this.node.css("left", this.x)
	this.node.css("z-index", this.cardId)

	this.node.css("width", this.width)
	this.node.css("height", this.height)
	//TODO: this part is to center the card origin
	//this.node.css("margin-top", (-this.width/2)+"px") //element centering business
	//this.node.css("margin-left", (-this.height/2)+"px")

	//this.node.draggable({	distance: DRAG_INERTIA, start: onStartDragCard, drag: onMoveDragCard, stop: onStopDragCard,
												//containment: "#gameBoard"})
	//										 zIndex: this.cardId, preventCollision: false }) //this does not allow for overlapping

	// the "proxy" part is necessary, as otherwise the this in the methods does not address the object -.- wat?
	this.node.bind("mousedown", $.proxy(this.onMouseDown,this));
	//TODO: add general on mousemove listener for whole body, or change z-index of dragged object
	this.node.bind("mousemove", $.proxy(this.onMouseMove,this));
	this.node.bind("mouseup", $.proxy(this.onMouseUp,this));
}

////EVENTS
Card.prototype.onMouseDown = function(e) {
	this.isBeingClicked = true
	this.preDragPos = [e.pageX, e.pageY]
	this.preDragCenterDelta = camera.screenToWorld(e.pageX, e.pageY)
	// where the mouse is clicked, relative to the card center
	this.preDragCenterDelta[0]=this.x-this.preDragCenterDelta[0] //TODO: this part needs reworking
	this.preDragCenterDelta[1]=this.y-this.preDragCenterDelta[1]

	this.node.css("z-index",9000)
	return false
}

//TODO: replace this by a function sensing the global mouse movement for smooth dragging
//on move, the currently dragged card(s) are moved along without minding if the mouse pointer leaves them for a fraction of a second
//the current solution breaks quite happily
Card.prototype.onMouseMove = function(e) {
	// TODO: I wanted to put this into helpers.js, but it was undefined here! What's your plan with helpers.js?
	if (this.isBeingClicked && !this.isBeingDragged && dist(this.preDragPos, [e.pageX, e.pageY]) > DRAG_INERTIA) {
		// If the user is holding a mousebutton down while moving the mouse, he is dragging.
		this.isBeingDragged = true
	}

	if (this.isBeingDragged) {
		var curPos = camera.screenToWorld(e.pageX, e.pageY)
		this.x = curPos[0] + this.preDragCenterDelta[0] //mind the dx to the initial dx to the center
		this.y = curPos[1] + this.preDragCenterDelta[1]

		this.node.css("top",this.y)
		this.node.css("left",this.x)
	}
	return false
}

Card.prototype.onMouseUp = function(e) {
	if (this.isBeingDragged) {
		this.isBeingDragged = false
		//this._broadcastPosition()
	} else if (this.isBeingClicked) {
		conn.send('{"wantFlip": "'+this.cardId+'"}');
	}
	this.isBeingClicked = false
	this.node.css("z-index",this.cardId)

	/*
	var contentStr = JSON.stringify({
		id: this.attr("cardId"),
		x: Math.floor(this.attr("x")),
		y: Math.floor(this.attr("y")),
		phi: this.rotation})
	contentStr = contentStr.replace(/"/g,"'")
	conn.send('{"moveCard": "'+contentStr+'"}');
	*/
	return false
}
