// use .enableDrag/.disableDrag to stop the cards from moving
// TODO: add listener to transmit movement to the server

Crafty.c("Card", {
	ready: true,
	init: function() {
		this.requires("2D,DOM,Color,Image,Multiway,Draggable");
	},
	makeCard: function(x,y) {
		asteroid = cardSource.componentPrefix+1 //TODO: this is not flexible
		this.addComponent(asteroid)
		.color("#000")
		.attr({x:x,y:y,w:200,h:200,z:1})
		.css("border", "3px solid white") // card borders
		.image(deckFaceImg, "repeat")
		.origin("center")
		.multiway(0.5)
		.bind("EnterFrame", function() {
			//is there something to do on each frame?
		})
		.bind('Click', function() {
    	//TODO: on click: bring card to front (this.z = 2, every other card= 1
		})
		return this
	},

	
})
