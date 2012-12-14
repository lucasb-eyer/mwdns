var camera;
var gameBoard, gameCards;

var VIEW_WIDTH, VIEW_HEIGHT;

// prepare for any incoming messages
function init() {
	camera = new Camera(0,0,1)
	gameCards = []

	refreshWindowSize()
	initAssets()

	//resize handler
	$(window).resize(function(){
		refreshWindowSize()
  });

	//TODO: use the page wide mouse position for dragging
	$(document).mousemove(function(event){
  	//console.log(event.pageX + ", " + event.pageY);
	});
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

	camera.move(gameBoard.width/2, gameBoard.height/2) //center on the middle of the game board

	//TODO: set the zoom factor so the whole game board is visible + margin
	//compute min zoom, max zoom
}

function createCards(cardCount) {
	var defaultCardX = gameBoard.width/2 - DEFAULT_CARD_W/2
	var defaultCardY = gameBoard.height/2 - DEFAULT_CARD_H/2

	for (var i = 0; i < cardCount; i++) {
		card = new Card(i,-1,defaultCardX,defaultCardY,DEFAULT_CARD_W,DEFAULT_CARD_H)
		card.create()
		//TODO: set default initial position(center?)
 		gameBoard.node.append(card.node)

		gameCards.push(card)
	}
}
