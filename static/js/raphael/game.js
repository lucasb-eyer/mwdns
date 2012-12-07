var HEIGTH, WIDTH;

var DRAG_INERTIA = 15 // pixel distance
	, ROTATION_SPEED = 25

var paper;

var viewX = 0
var viewY = 0
var viewZoom = 1

function updateView() {
	paper.setViewBox(viewX,viewY,WIDTH*zoom,HEIGHT*zoom,false)
}

function onZoomView(delta) {
	zoom = Math.max(0.1,zoom-0.1*delta)
	updateView()
}

function onRotateCard(card,delta) {
	card.transform("...R"+delta*ROTATION_SPEED)
	console.log("rotation!")
}

function startDragView () {
	this.startX = viewX
	this.startY = viewY
}
function moveDragView (dx, dy) {
	viewX = this.startX-dx
	viewY = this.startY-dy
	updateView()
}
function endDragView () {
}

function startDragCard() {
	this.startX = this.attr("x")
	this.startY = this.attr("y")
}
function moveDragCard(dx, dy) {
	if (Math.sqrt(dx*dx+dy*dy) < DRAG_INERTIA && !this.dragging) {
		//do nothing, clicking?
	} else if (!this.dragging) {
		this.dragging=true
		var card = this
		$(this.node).bind('mousewheel', function(event, delta) {
			onRotateCard(card, delta);
    });
	}

	if (this.dragging) {
		this.attr({x: this.startX + dx*zoom, y: this.startY + dy*zoom});
	}
}
function endDragCard() {
	if (this.dragging) {
		//send the position or something
	} else {
		//looks like a click then.
		console.log("Click!")
	}

	this.dragging = false
	$(this.node).unbind('mousewheel');

	/*
	var contentStr = JSON.stringify({
		id: this.attr("cardId"),
		x: Math.floor(this.attr("x")),
		y: Math.floor(this.attr("y")),
		phi: this.rotation})
	contentStr = contentStr.replace(/"/g,"'")
	conn.send('{"moveCard": "'+contentStr+'"}');
	*/
}

var rect;
function init() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	zoom = 1;

	paper = Raphael(0,0,WIDTH,HEIGHT);

	//TODO: board sizes
	board = paper.rect(0,0,WIDTH,HEIGHT); //center point, dimensions
	board.attr("fill", "#0f0");
	board.attr("stroke", "#fff");
	board.drag(moveDragView,startDragView,endDragView)
	$(board.node).bind('mousewheel', function(event, delta) {
		onZoomView(delta)
    });

	card = paper.rect(50,50,100,100); //center point, dimensions
	card.attr("cardId", "1");
	card.attr("fill", "#f00");
	card.attr("stroke", "#000");

	card.dragging = false
	card.drag(moveDragCard,startDragCard,endDragCard)
}
