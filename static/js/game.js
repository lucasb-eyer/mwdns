var camera
var gameBoard, gameCards
var g_scoreboard, g_chat
var g_players, g_mypid
var g_currentlyDraggedCard

var VIEW_WIDTH, VIEW_HEIGHT

var CAMERA_KEYBOARD_SPEED = 500 // pixels per second
var CAMERA_KEYBOARD_UPDATE_INTERVAL = 10 // milliseconds

// prepare for any incoming messages
function init() {
    var keytable = {}
    camera = new Camera(0,0,1)
    gameCards = []
    g_players = []
    refreshWindowSize()
    initAssets()

    //resize handler
    $(window).resize(function(){
        refreshWindowSize()
    })

    g_scoreboard = new Scoreboard('#scoreboard')
    g_chat = new Chat('#chatMessages', '#chatControl')

    // We init the document-wide event handlers here to avoid confusion/hiding.

    // Use the page wide mouse position for dragging
    $(document).on("mousemove", function(e){
        if(g_currentlyDraggedCard != undefined) { //wat -> this var can be 0, which would leave it sad and motionless
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
        return true
    })

    $(document).on("mouseup", function(e) {
        // Stop panning the view when releasing the right mouse button
        if(e.which == 3) {
            camera.stopPanning(e.pageX, e.pageY)
            return false
        } else if (e.which == 1) {
            if(g_currentlyDraggedCard != undefined) { //wat -> this var can be 0, which would leave it sad and motionless
                gameCards[g_currentlyDraggedCard].onMouseUp(e)
            }
        }
        return true
    })

    // Scrolling for zooming should work everywhere.
    $(document).on("mousewheel", function(e, delta, deltaX, deltaY) {
        //delta is either 1 or -1
        camera.zoomStep(delta)
        return false
    })

    inputGotFocus = function() {
        var $ae = $(document.activeElement)
        return $ae.is('input') || $ae.is('textarea')
    }

    $(document).on("keyup", function(e) {
        // We don't want to steal input's keystrokes!
        if(inputGotFocus()) {
            return true
        }

        // Move the board around using WASD or arrow keys
        if(e.keyCode == 37 || e.keyCode == 65) {
            window.clearInterval(keytable.left)
            keytable.left = undefined
        } else if(e.keyCode == 39 || e.keyCode == 68) {
            window.clearInterval(keytable.right)
            keytable.right = undefined
        } else if(e.keyCode == 38 || e.keyCode == 87) {
            window.clearInterval(keytable.up)
            keytable.up = undefined
        } else if(e.keyCode == 40 || e.keyCode == 83) {
            window.clearInterval(keytable.down)
            keytable.down = undefined
        } else {
            return true //none of these? pass the event on then
        }
        return false
    })

    $(document).on("keydown", function(e) {
        // We don't want to steal input's keystrokes!
        if(inputGotFocus()) {
            return true
        }

        // Move the board around using WASD or arrow keys
        if((e.keyCode == 37 || e.keyCode == 65) && !keytable.left) {
            keytable.left = window.setInterval(function() {
                camera.moveBy(-CAMERA_KEYBOARD_SPEED*CAMERA_KEYBOARD_UPDATE_INTERVAL/1000.0, 0)
            }, CAMERA_KEYBOARD_UPDATE_INTERVAL)
        } else if((e.keyCode == 39 || e.keyCode == 68) && !keytable.right) {
            keytable.right = window.setInterval(function() {
                camera.moveBy(CAMERA_KEYBOARD_SPEED*CAMERA_KEYBOARD_UPDATE_INTERVAL/1000.0, 0)
            }, CAMERA_KEYBOARD_UPDATE_INTERVAL)
        } else if((e.keyCode == 38 || e.keyCode == 87) && !keytable.up) {
            keytable.up = window.setInterval(function() {
                camera.moveBy(0, -CAMERA_KEYBOARD_SPEED*CAMERA_KEYBOARD_UPDATE_INTERVAL/1000.0)
            }, CAMERA_KEYBOARD_UPDATE_INTERVAL)
        } else if((e.keyCode == 40 || e.keyCode == 83) && !keytable.down) {
            keytable.down = window.setInterval(function() {
                camera.moveBy(0, CAMERA_KEYBOARD_SPEED*CAMERA_KEYBOARD_UPDATE_INTERVAL/1000.0)
            }, CAMERA_KEYBOARD_UPDATE_INTERVAL)
        } else {
            return true //none of these? pass the event on then
        }
        return false
    })
}

//listen for window size changes, adjust the VIEW_WIDTH, VIEW_HEIGHT global parameters, refresh the camera view
function refreshWindowSize() {
    //TODO: fix copypasta
    var outerWidthOrZero = function($obj) { return $obj.is(":visible") ? $obj.outerWidth(true) : 0 }

    resizeGui()

    // center the camera in the center of the visible part of the screen
    //TODO: adjust zoom the first time it happens, correct z levels
    VIEW_HEIGHT = window.innerHeight
    VIEW_WIDTH = window.innerWidth-outerWidthOrZero($("#playerGui"))

    camera.updateObjects()
}

function createBoard(width,height,maxPlayers) {
    gameBoard = new Board(width,height,maxPlayers)
    gameBoard.create()
    $('body').append(gameBoard.node)

    //TODO: set the initial(furthest out) zoom factor/level so the whole game board is visible + margin
    camera.moveTo(gameBoard.width/2, gameBoard.height/2) //center on the middle of the game board
}

function createCards(cardCount, cardType) {
    var sources = cardTypeDefinitions.cardImageSources

    if (!(cardType in sources)) {
        console.error("cardType " +cardType+ " not specified in definition!")
        cardType = 1 //default to random colors square
    }

    cardInformation = sources[cardType]
    console.debug("Trying to load card type '"+cardInformation.name+"'.")

    //TODO: check constraints like maxPairs?
    var cardWidth = cardInformation.cardSizeX || DEFAULT_CARD_W
    var cardHeight = cardInformation.cardSizeY || DEFAULT_CARD_H

    if (cardWidth === undefined || cardHeight === undefined) {
        console.error("Width or height are badly defined, reverting to defaults")
    }

    //TODO: this giant try is a BAD thing
    switch (cardInformation.type) {
        case "function":
            switch(cardInformation.func) {
                case "randomDistinctiveHappyColors":
                    cardSource = new ImageSourceColorRandom(cardWidth, cardHeight, cardCount)
                    break;
                default:
                    console.error("No such card look function '"+ cardInformation.func +"'.")
            }
            break;
        case "tilemap":
            //TODO: this is cheating, and does not respect the card size
            // a general tilemap-processing thingy would be appropriate, that actually processes the cardInformation
            cardSource = new ImageSourceTileMap(cardInformation)
            break;
        default:
            console.error("Unknown card source: " + cardInformation.type + "(" + cardInformation.id + ")")
    }

    // set default if stuff went wrong
    if (cardSource === undefined) {
        console.debug("Something went wrong, falling back to happy colors!")
        cardSource = new ImageSourceColorRandom(cardWidth, cardHeight, cardCount)
    }

    // Sets the default initial position to be the center.
    var defaultCardX = gameBoard.width/2 - cardWidth/2
    var defaultCardY = gameBoard.height/2 - cardHeight/2

    for (var i = 0; i < cardCount; i++) {
        card = new Card(i,-1,defaultCardX,defaultCardY, cardWidth, cardHeight)
        card.create()
        gameBoard.node.append(card.node)

        gameCards.push(card)
    }
}
