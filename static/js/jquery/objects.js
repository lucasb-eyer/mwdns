// Keeps track of the currently highest z-index of the cards.
var g_max_card_z = 1;

Camera = function(x,y,zoom) {
	this.x = x //center of the camera view
	this.y = y
	this.zoomFactor = 1
	this.zoomLevel = 0
	this.panning = false
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
Camera.prototype.zoomStep = function(zoomDelta) { //how many steps in or out
	//TODO: mind the zoom or assume that it is not manipulated?
	this.zoomLevel += zoomDelta
	//TODO: clamp min zoom, max zoom
	this.zoomFactor = Math.pow(ZOOM_STEP,this.zoomLevel) //TODO: vary the 
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
	dx = x - this.panX
	dy = y - this.panY
	this.move(this.x - dx/this.zoomFactor, this.y - dy/this.zoomFactor)
	this.panX = x
	this.panY = y
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

Card = function(cardId,type,x,y,w,h,phi) {
	this.cardId = cardId
	this.type = type
	this.x = x //TODO: x and y are not kept current at the moment
	this.y = y
	this.phi = phi || DEFAULT_CARD_PHI
	this.width = w || DEFAULT_CARD_W
	this.height = h || DEFAULT_CARD_H

	this.isBeingClicked = false
	this.isBeingDragged = false

	//TODO: in fact, this might better be realized with a counter... but these are obscure cases
	this.isWaitingForFlipback = false
}

Card.prototype.showBack = function() {
	this.type = -1
	this.node.empty()
	this.node.append(deckFaceTemplate.clone())
}

Card.prototype.showFront = function(type) {
	this.type = type
	this.node.empty()
	//here more elaborate cards might be constructed
	this.node.append(cardSource.getElement(type).clone())
}

//TODO: animations may come in here
Card.prototype.doFlipCard = function(type) {
	this.type = type
	// only mind the waiting if flipping back to -1
	if (this.waitingForFlipback || type != -1) {
		// either draw the deckFace
		if (type == -1) {
			this.showBack()
		// or the actual frontside of the card
		} else {
			this.showFront(type)
		}
	}
}

// considers a healthy timeout, if the card is flipped back
// this code is quite ugly
Card.prototype.flipCard = function(type) {
	if (type == -1) {
		this.waitingForFlipback = true
		setTimeout($.proxy(function(){this.doFlipCard(type)},this), CARD_TURNBACK_TIMEOUT)
	} else {
		this.doFlipCard(type)
	}
}

Card.prototype.create = function() {
	//TODO: get the html from a template instead of typing it here?
	//TODO: Implement card rotation
	this.node = $('<div id="card_'+this.cardId+'" class="gameCardSquare"></div>')
	this.node.css("top", this.y) //TODO: px?
	this.node.css("left", this.x)
	this.node.css("z-index", ++g_max_card_z)

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
	this.node.bind("mouseup", $.proxy(this.onMouseUp,this));
	this.showBack() //flip to the back side without wait or animations
}

Card.prototype.moveTo = function(x,y,phi) {
	//TODO: change duration, based on movement speed and movement distance
	//TODO: add support for phi
	// Whenever a card moves, it goes to the front.
	this.node.css("z-index", ++g_max_card_z)
	this.node.animate({
		left: x,
		top: y,
	})
	this.x = x
	this.y = y
	this.phi = phi
}

////EVENTS
Card.prototype.onMouseDown = function(e) {
	// No interaction when it's not your turn!
	if ( !g_players[g_mypid].canplay ) {
		return false
	}

	g_currentlyDraggedCard = this.cardId
	this.isBeingClicked = true
	this.preDragPos = [e.pageX, e.pageY]
	this.preDragCenterDelta = camera.screenToWorld(e.pageX, e.pageY)
	// where the mouse is clicked, relative to the card center
	this.preDragCenterDelta[0]=this.x-this.preDragCenterDelta[0] //TODO: this part needs reworking
	this.preDragCenterDelta[1]=this.y-this.preDragCenterDelta[1]

	this.node.css("z-index", ++g_max_card_z)
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
		this._broadcastPosition()
	} else if (this.isBeingClicked) {
		conn.send('{"wantFlip": "'+this.cardId+'"}');
	}
	this.isBeingClicked = false
	g_currentlyDraggedCard = undefined

	return false
}

Card.prototype._broadcastPosition = function() {
	var contentStr = JSON.stringify({
		id: this.cardId,
		x: Math.floor(this.x),
		y: Math.floor(this.y),
		phi: this.phi
	})
	// We make this dance of stringifying the value and then jsonifying it back
	// on the server because the server's json lib sucks ass.
	// It needs a map of string->string as main message.
	contentStr = contentStr.replace(/"/g,"'")
	conn.send('{"moveCard": "'+contentStr+'"}')
}

Player = function(pid, name, color, canplay) {
	this.pid = pid
	this.name = name
	this.color = color || randomHappyColor()
	this.canplay = canplay || false
	this.points = 0

	// TODO: Maybe call changeCanPlay from here to achieve the same gui effect?
}

Player.prototype.changeCanPlay = function(canplay) {
	this.canplay = canplay
	// TODO: Update some gui which indicates whether he can play or not.
}

Player.prototype.updatePoints = function(newpoints) {
	delta = newpoints - this.points
	this.points = newpoints
	// TODO: Show the delta.
}
