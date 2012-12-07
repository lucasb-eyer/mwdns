var HEIGTH, WIDTH;

var DRAG_INERTIA = 15 // pixel distance
	, bla=2

var paper;

var viewX = 0
var viewY = 0
var viewZoom = 1


function startDragView () {
    this.startX = viewX
    this.startY = viewY
}
function moveDragView (dx, dy) {
	viewX = this.startX-dx
	viewY = this.startY-dy
	paper.setViewBox(viewX,viewY,WIDTH*zoom,HEIGHT*zoom,false)
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
		} else {
			this.dragging=true
		}

		if (this.dragging) {
    	this.attr({x: this.startX + dx, y: this.startY + dy});
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


	rect = paper.rect(50,50,100,100); //center point, dimensions
	rect.attr("cardId", "1");
	rect.attr("fill", "#f00");
	rect.attr("stroke", "#000");

	rect.dragging = false


	rect.drag(moveDragCard,startDragCard,endDragCard)

	paper.setViewBox(50,50,WIDTH*zoom,HEIGHT*zoom,false)
}
