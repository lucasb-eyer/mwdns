var camera;
var gameBoard, gameCards;

var VIEW_WIDTH, VIEW_HEIGHT;

// prepare for any incoming messages
function init() {
	camera = new Camera(0,0,1)
	gameCards = []

	//TODO: listen for window size changes, adjust the VIEW_WIDTH, VIEW_HEIGHT global parameters, refresh the camera view
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
	var defaultCardW = 100
	var defaultCardH = 100

	var defaultCardX = gameBoard.width/2 - defaultCardW/2
	var defaultCardY = gameBoard.height/2 - defaultCardH/2

	for (var i = 0; i < cardCount; i++) {
		card = new Card(i,-1,defaultCardX,defaultCardY,defaultCardW,defaultCardH)
		card.create()
		//TODO: set default initial position(center?)
 		gameBoard.node.append(card.node)

		gameCards.push(card)
	}
}
