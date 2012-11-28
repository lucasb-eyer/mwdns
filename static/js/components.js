// use .enableDrag/.disableDrag to stop the cards from moving
// TODO: add listener to transmit movement to the server
//

var CARD_PADDING = 10
var CARD_TURNBACK_TIMEOUT = 1000 //ms
var DRAG_INERTIA = 5 // pixel distance

Crafty.c("Card", {
	ready: true,
	isBeingDragged: false,
	isBeingRotated: false,
	isBeingClicked: false,
	preDragPos: [0,0],
	preRotAngle: 0,

	type: -1, //backside = -1, otherwise side is the image id to display

	waitingForFlipback: false, //TODO: in fact, this might better be realized with a counter... but these are obscure cases
	// this solution does not prevent early flipping back
	doFlipCard: function(type) { 
	//this actually DOES flip the card, without timeouts
		if (this.waitingForFlipback || type != -1) {
			this.waitingForFlipback = false
			this.type = type
			this.trigger("Change") // redraw self
		}
	},
	flipCard: function(type) {
	// considers a healthy timeout, if the card is flipped back
		// this code is quite ugly
		if (type == -1) {
			this.waitingForFlipback = true
			this.timeout(function(){this.doFlipCard(type)}, CARD_TURNBACK_TIMEOUT)
		} else {
			this.doFlipCard(type)
		}
	},
	init: function() {
		this.requires("2D,Canvas,Multiway,Draggable,Tween");
		var draw = function(e) {
			var x = e.pos._x
				, y = e.pos._y
				, w = e.pos._w
				, h = e.pos._h

			var ctx = e.ctx
			ctx.strokeStyle = "#000"
			ctx.lineWidth = 0.05
			ctx.fillStyle= "#FFF"
			ctx.fillRect(x,y,w,h);
			ctx.strokeRect(x,y,w,h);

			var inx = e.pos._x+CARD_PADDING
				, iny = e.pos._y+CARD_PADDING
				, inw = e.pos._w-2*CARD_PADDING
				, inh = e.pos._h-2*CARD_PADDING
			if (this.type == -1) {
				ctx.fillStyle = ctx.createPattern(deckFaceImg, "repeat");
				ctx.fillRect(inx,iny,inw,inh); 
			} else {
				//FILL with a color
				//ctx.fillStyle = "#F00"
				//ctx.fillRect(inx,iny,inw,inh); 
				cardSource.drawImg(this.type, ctx, inx,iny,inw,inh)
			}
		}

		this.bind("Draw",draw)
	},
	makeCard: function(x,y,id) {
		this.attr({x:x,y:y,w:200,h:200,z:1,id:id})
		.origin("center")
		.multiway(0.5)
		.bind("EnterFrame", function() {
			//is there something to do on each frame?
		})
		.bind('Dragging', function() {})
		//TODO: a more intuitive clicking/rotation model
		// Is this it? Dragging and clicking are simply left-click.
		// If the mouse moves more than DRAG_INERTIA while being clicked, it becomes dragging.
		.bind('MouseDown', function(e) {
			//TODO: check if card movement is actually possible, or tell the server and he "answers" with the correct position (card will move back)
			// isBeingClicked has changed meaning - it is now more like "isMouseButtonPressed"
			this.isBeingClicked = true
			this.preDragPos = [e.x, e.y]
			// check if ctrl button is pressed -> rotate card?
			if (Crafty.keydown[Crafty.keys.CTRL]) {
				this.isBeingRotated = true
				this.preRotAngle = this.rotation
			}
		})
		.bind('MouseUp', function() {
			if (this.isBeingDragged) {
				this.isBeingDragged = false
				//TODO: not tested - encode json " as '
				this._broadcastPosition()
				this.disableDrag()
			} else if (this.isBeingRotated) {
				this.isBeingRotated = false
				this._broadcastPosition()
			} else if (this.isBeingClicked) {
				conn.send('{"wantFlip": "'+this.id+'"}');
			}
			this.isBeingClicked = false
		})
		.bind('MouseMove', function(e) {
			// TODO: I wanted to put this into helpers.js, but it was undefined here! What's your plan with helpers.js?
			dist = function(p1, p2) {
			  var dx = p1[0]-p2[0],
			      dy = p1[1]-p2[1];
			  return Math.sqrt(dx*dx+dy*dy);
			}
			angle_between = function(p1, p2) {
			  var dx = p1[0]-p2[0],
			      dy = p1[1]-p2[1];
			  return Math.atan2(dy, dx) * 57.2957795
			}
			if (this.isBeingRotated) {
				// Rotates the card around its center when moving the mouse around the center.
				centerOfCard = [this.x+this.w/2, this.y+this.h/2]
				startAngle = angle_between(centerOfCard, this.preDragPos)
				currentAngle = angle_between(centerOfCard, [e.x, e.y])
				this.rotation = this.preRotAngle + currentAngle - startAngle
			} else if (this.isBeingClicked && !this.isBeingDragged && dist(this.preDragPos, [e.x, e.y]) > DRAG_INERTIA) {
				// If the user is holding a mousebutton down while moving the mouse, he is dragging.
				this.enableDrag().startDrag()
				this.isBeingDragged = true
			}
		})
		.bind('MouseOut', function() {
			// TODO: shouldn't this be the same as MouseUp? Just 'lose' the card when leaving the window.
			this.isBeingClicked = false
			if (this.isBeingRotated) {
				this.isBeingRotated = false
				this._broadcastPosition()
			}
		})
		.disableDrag()

		return this
	},
	// actually more something like broadcast rotation
	_broadcastPosition: function() {
		var contentStr = JSON.stringify({
			id: this.id, 
			x: Math.floor(this.x),
			y: Math.floor(this.y), 
			phi: this.rotation})
		contentStr = contentStr.replace(/"/g,"'")
		conn.send('{"moveCard": "'+contentStr+'"}');
	}
})
