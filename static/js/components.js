// use .enableDrag/.disableDrag to stop the cards from moving
// TODO: add listener to transmit movement to the server
//

var PADDING = 10

Crafty.c("Card", {
	ready: true,
	isBeingDragged: false,
	isBeingRotated: false,
	isBeingClicked: false,

	init: function() {
		this.requires("2D,Canvas,Multiway,Draggable,Tween");
		var draw = function(e) {
			var ctx = e.ctx
			ctx.fillStyle= "#FFF"
			ctx.fillRect(e.pos._x, e.pos._y, e.pos._w, e.pos._h); 
			ctx.fillStyle = ctx.createPattern(deckFaceImg, "repeat");
			ctx.fillRect(e.pos._x+PADDING, e.pos._y+PADDING, e.pos._w-2*PADDING, e.pos._h-2*PADDING); 
		}

		this.bind("Draw",draw)
	},
	makeCard: function(x,y,id) {
		this.attr({x:x,y:y,w:200,h:200,z:1,id:id})
		//.css("border", "3px solid white") // card borders
		//.image(deckFaceImg, "repeat")
		.origin("center")
		.multiway(0.5)
		.bind("EnterFrame", function() {
			//is there something to do on each frame?
		})
		.bind('Dragging', function() {})
		//TODO: a more intuitive clicking/rotation model
		.bind('MouseDown', function() {
			//TODO: check if card movement is actually possible, or tell the server and he "answers" with the correct position (card will move back)
			// check if shift button is pressed -> not draggable anymore, drag that card around.
			if (Crafty.keydown[Crafty.keys.SHIFT]) {
				this.enableDrag().startDrag()
				this.isBeingDragged = true

			// check if ctrl button is pressed -> rotate card?
			} else if (Crafty.keydown[Crafty.keys.CTRL]) {
				this.isBeingRotated = true
				console.log("Rotate!") //TODO
			} else {
				this.isBeingClicked = true
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
				this.isBeingClicked = false
				conn.send('{"wantFlip": "'+this.id+'"}');
			}
		})
		.bind('MouseMove', function() {
			if (this.isBeingRotated) {
				//TODO: compute the new card rotation, depending on mouse movement
				console.log("rotation changing!")
			}
		})
		.bind('MouseOut', function() {
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
