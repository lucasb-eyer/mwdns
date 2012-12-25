var camera;
var gameBoard, gameCards;
var g_players, g_mypid;
var g_currentlyDraggedCard;

var VIEW_WIDTH, VIEW_HEIGHT;

// prepare for any incoming messages
function init() {
	camera = new Camera(0,0,1)
	gameCards = []
	g_players = []
	refreshWindowSize()
	initAssets()

	//resize handler
	$(window).resize(function(){
		refreshWindowSize()
	})

	// We init the document-wide event handlers here to avoid confusion/hiding.

	$(document).on("mousemove", function(e) {
		// Use the page wide mouse position for dragging
		if(g_currentlyDraggedCard) {
			gameCards[g_currentlyDraggedCard].onMouseMove(e)
		}
		// And also for panning
		if(camera.isPanning()) {
			camera.updatePan(e.pageX, e.pageY)
		}
	})

	$(document).on("mousedown", function(e) {
		// Pan the view using the right mouse button
		if(e.which == 3) {
			camera.startPanning(e.pageX, e.pageY)
			return false
		}
	})

	$(document).on("mouseup", function(e) {
		// Stop panning the view when releasing the right mouse button
		if(e.which == 3) {
			camera.stopPanning(e.pageX, e.pageY)
		}
	})

	// Scrolling for zooming should work everywhere.
	$(document).on("mousewheel", function(e, delta, deltaX, deltaY) {
		//delta is either 1 or -1
		camera.zoomStep(delta)
		return false
	})
}

//listen for window size changes, adjust the VIEW_WIDTH, VIEW_HEIGHT global parameters, refresh the camera view
function refreshWindowSize() {
	VIEW_HEIGHT = window.innerHeight;
	VIEW_WIDTH = window.innerWidth;
	camera.updateObjects();
}

function createBoard(width,height) {
	gameBoard = new Board(width,height)
	gameBoard.create()
	$('body').append(gameBoard.node)

	//TODO: set the initial(furthest out) zoom factor/level so the whole game board is visible + margin
	camera.move(gameBoard.width/2, gameBoard.height/2) //center on the middle of the game board
}

function createCards(cardCount) {
	// Sets the default initial position to be the center.
	var defaultCardX = gameBoard.width/2 - DEFAULT_CARD_W/2
	var defaultCardY = gameBoard.height/2 - DEFAULT_CARD_H/2

	for (var i = 0; i < cardCount; i++) {
		card = new Card(i,-1,defaultCardX,defaultCardY)
		card.create()
		gameBoard.node.append(card.node)

		gameCards.push(card)
	}
}
