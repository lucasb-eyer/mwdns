// Keeps track of the currently highest z-index of the cards.
var g_max_card_z = 1

Card = function(cardId,type,x,y,w,h,phi) {
    this.cardId = cardId
    this.type = type
    this.x = x // The center of the card, in (absolute) pixel
    this.y = y
    this.phi = phi || DEFAULT_CARD_PHI
    this.width = w || DEFAULT_CARD_W
    this.height = h || DEFAULT_CARD_H

    // get from server, remember
    this.scoredBy = NO_PLAYER //which player has opened this particular pair of cards

    this.isBeingClicked = false
    this.isBeingRotated = false
    this.isBeingDragged = false

    //TODO: in fact, this might better be realized with a counter... but these are obscure cases
    this.isWaitingForFlipback = false
}

Card.prototype.refresh = function() {
    if (this.type == -1) {
        this.showBack()
    } else {
        this.showFront(this.type,this.scoredBy)
    }
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
    this.node.bind("mousedown", $.proxy(this.onMouseDown,this))
    this.node.bind("mouseup", $.proxy(this.onMouseUp,this))
    this.showBack() //flip to the back side without wait or animations
}

Card.prototype.moveTo = function(x,y,phi) {
    this.x = x
    this.y = y
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
    this.preDragCenterDelta[0] -= this.x
    this.preDragCenterDelta[1] -= this.y

    if (e.ctrlKey) {
        this.preDragPhi = this.phi
        this.isBeingRotated = true
    } else {
        this.isBeingRotated = false
    }

    this.node.css("z-index", ++g_max_card_z)
    return false
}

Card.prototype.onMouseMove = function(e) {
    var curPos = camera.screenToWorld(e.pageX, e.pageY)

    if (this.isBeingRotated) {
        // Note: The Y axis pointing down plays nicely with the angles being
        //       counter-clockwise, so no need to negate Y here.

        // The angle at which the cursor was when we started dragging, relative to card center.
        var dragStartCursorAngle = Math.atan2(this.preDragCenterDelta[1], this.preDragCenterDelta[0])*57.2957795

        // The angle at which the cursor is right now, relative to the card center.
        var currentCursorAngle = Math.atan2((curPos[1]-this.y), curPos[0]-this.x)*57.2957795

        // Thus, this is how much the user feels he "turned" the cursor around the card.
        var cursorPhi = currentCursorAngle - dragStartCursorAngle

        // This just needs to be added to the angle the card had when we
        //  started this whole ordeal.
        this.phi = this.preDragPhi + cursorPhi
        this.node.css("rotate", this.phi)

        return false
    }

    if (this.isBeingClicked && !this.isBeingDragged && dist(this.preDragPos, [e.pageX, e.pageY]) > DRAG_INERTIA) {
        // If the user is holding a mousebutton down while moving the mouse, he is dragging.
        this.isBeingDragged = true
    }

    if (this.isBeingDragged) {
        this.x = curPos[0] - this.preDragCenterDelta[0] //mind the dx to the initial dx to the center
        this.y = curPos[1] - this.preDragCenterDelta[1]

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

    if (this.isBeingRotated) {
        this.isBeingRotated = false
        this._broadcastPosition()
    } else if (this.isBeingDragged) {
        this.isBeingDragged = false
        this._broadcastPosition()
    } else if (this.isBeingClicked) {
        sendMessage('{"wantFlip": "'+this.cardId+'"}')
    }
    this.isBeingClicked = false
    g_currentlyDraggedCard = undefined

    return false
}

Card.prototype._broadcastPosition = function() {
    var contentStr = JSON.stringify({
        id: this.cardId,
        x: this.x,
        y: this.y,
        phi: this.phi
    })
    // We make this dance of stringifying the value and then jsonifying it back
    // on the server because the server's json lib sucks ass.
    // It needs a map of string->string as main message.
    contentStr = contentStr.replace(/"/g,"'")
    sendMessage('{"moveCard": "'+contentStr+'"}')
}
