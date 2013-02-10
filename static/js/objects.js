// Keeps track of the currently highest z-index of the cards.
var g_max_card_z = 1;

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

Card = function(cardId,type,x,y,w,h,phi) {
	this.cardId = cardId
	this.type = type
	this.x = x // The center of the card, in (absolute) pixel
	this.y = y
	this.phi = phi || DEFAULT_CARD_PHI
	this.width = w || cardWidth
	this.height = h || cardHeight

	//TODO: get from server, remember
	this.scoredBy = NO_PLAYER //which player has opened this particular pair of cards

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

Card.prototype.showFront = function(type,scoredBy) {
	this.type = type
	this.scoredBy = scoredBy
	this.node.empty()
	//here more elaborate cards might be constructed
	this.node.append(cardSource.getElement(type).clone())

	if (g_players.hasOwnProperty(this.scoredBy)) {
		var color = g_players[this.scoredBy].color
		this.node.css("background-color", color)
	} else {
		this.node.css("background-color","white") //TODO: take info from assets instead of hard coded default
	}
}

//TODO: animations may come in here
Card.prototype.doFlipCard = function(type,scoredBy) {
	this.type = type
	// only mind the waiting if flipping back to -1
	if (this.waitingForFlipback || type != -1) {
		// either draw the deckFace
		if (type == -1) {
			this.showBack()
		// or the actual frontside of the card
		} else {
			this.showFront(type,scoredBy)
		}
	}
}

// considers a healthy timeout, if the card is flipped back
// this code is quite ugly
Card.prototype.flipCard = function(type,scoredBy) {
	if (type == -1) {
		this.waitingForFlipback = true
		setTimeout($.proxy(function(){this.doFlipCard(type,scoredBy)},this), CARD_TURNBACK_TIMEOUT)
	} else {
		this.doFlipCard(type,scoredBy)
	}
}

Card.prototype.create = function() {
	//TODO: get the html from a template instead of typing it here?
	this.node = $('<div id="card_'+this.cardId+'" class="gameCardSquare"></div>')
	this.node.css("top", (this.y - this.height/2) + "px")
	this.node.css("left", (this.x - this.widht/2) + "px")
	this.node.css("rotate",this.phi)
	this.node.css("z-index", ++g_max_card_z)

	this.node.css("width", this.width + "px")
	this.node.css("height", this.height + "px")

	// the "proxy" part is necessary, as otherwise the this in the methods does not address the object -.- wat?
	this.node.bind("mousedown", $.proxy(this.onMouseDown,this));
	this.node.bind("mouseup", $.proxy(this.onMouseUp,this));
	this.showBack() //flip to the back side without wait or animations
}

Card.prototype.moveTo = function(x,y,phi) {
	// Convert x,y from relative (0-1) to absolute (0-boardsize) coordinates
	// but also respect the card sizes so as not to go out of the game board.
	absxy = gameBoard.rel2abs(x, y, this.width, this.height)

	this.x = absxy[0]
	this.y = absxy[1]
	this.phi = phi

	//TODO: change duration, based on movement speed and movement distance
	// Whenever a card moves, it goes to the front.
	this.node.css("z-index", ++g_max_card_z)
	this.node.transit({
		rotate: phi,
		left: this.x-this.width/2,
		top: this.y-this.height/2
	})
}

////EVENTS
Card.prototype.onMouseDown = function(e) {
	// Only use leftclicks for dragging cards around.
	if ( e.which != 1 ) {
		return true
	}

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

		this.node.css("top",this.y-this.height/2)
		this.node.css("left",this.x-this.width/2)
	}
	return false
}

Card.prototype.onMouseUp = function(e) {
	// Same here, only leftclick interaction with cards.
	if (e.which != 1) {
		return true
	}

	if (this.isBeingDragged) {
		this.isBeingDragged = false
		this._broadcastPosition()
	} else if (this.isBeingClicked) {
		sendMessage('{"wantFlip": "'+this.cardId+'"}');
	}
	this.isBeingClicked = false
	g_currentlyDraggedCard = undefined

	return false
}

Card.prototype._broadcastPosition = function() {
	// Don't forget to conver the coordinates to relative ones for the message.
	relxy = gameBoard.abs2rel(this.x, this.y, this.width, this.height)

	var contentStr = JSON.stringify({
		id: this.cardId,
		x: relxy[0],
		y: relxy[1],
		phi: this.phi
	})
	// We make this dance of stringifying the value and then jsonifying it back
	// on the server because the server's json lib sucks ass.
	// It needs a map of string->string as main message.
	contentStr = contentStr.replace(/"/g,"'")
	sendMessage('{"moveCard": "'+contentStr+'"}')
}

Player = function(pid, name, color, canplay) {
	this.pid = pid
	this.name = name || "Bob"
	this.color = color || randomHappyColor()
	this.canplay = canplay || false
	this.points = 0

	// TODO: Maybe call changeCanPlay from here to achieve the same gui effect?

	// Add myself to the scoreboard.
	g_scoreboard.addPlayer(this.pid, this.name, this.color, this.points, this.canplay)
}

Player.prototype.changeCanPlay = function(canplay) {
	g_scoreboard.updateCanPlay(this.pid, canplay)
	this.canplay = canplay
}

Player.prototype.updatePoints = function(newpoints) {
	g_scoreboard.updateScore(this.pid, newpoints, newpoints - this.points)
	this.points = newpoints
}

Player.prototype.changeName = function(newname) {
	g_scoreboard.updateName(this.pid, newname)
	this.name = newname
}

Player.prototype.changeColor = function(newcol) {
	g_scoreboard.updateColor(this.pid, newcol)
	this.color = newcol
}
