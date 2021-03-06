var conn

function connect() {
    var messagesCount = 0
    if (window["WebSocket"]) {
        // parse current url parameters
        var vars = {}
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value
        })
        var g = vars["g"]

        //connect to the current host/port combination
        var address = "ws://"+window.location.hostname+":"+window.location.port+"/ws?g="+g
        conn = new WebSocket(address)
        conn.onclose = function(evt) {
            console.log(evt) //DEBUG
        }
        conn.onmessage = function(evt) {
            console.log("Msg:" + evt.data) //DEBUG
            handleMessage(evt.data)
        }
    } else {
        console.log("Your browser does not support WebSockets.")
    }
}

function handleMessage(msg){
    var json = jQuery.parseJSON(msg)
    if ( json.msg == "initBoard" ) {
        createBoard(json.boardWidth, json.boardHeight, json.maxPlayers)
        createCards(json.cardCount, json.cardType, json.colors)
    } else if ( json.msg == "cardMove" ) {
        gameCards[json.id].moveTo(json.x, json.y, json.phi)
    } else if ( json.msg == "cardOpen" ) {
        gameCards[json.id].open(json.type, json.scoredBy)
    } else if ( json.msg == "cardsClose" ) {
        var cardsToClose = []
        for (var i=0 ; i<json.ids.length ; i++) {
            if(json.ids[i] in gameCards) {
                cardsToClose.push(gameCards[json.ids[i]])
            }
        }
        closeCards(cardsToClose)
        // Coffee:
        // closeCards (gameCards[id] for id in json.ids when gameCards[id]?)
    } else if ( json.msg == "player" ) {
        if ( !g_players.hasOwnProperty(json.pid) ) {
            // A new player?
            if ( json.itsyou ) {
                // And it's me? Get a hold of my own pid!
                g_mypid = json.pid

                // TODO: If the player has stored settings (name, color) client-
                // side, send them here using a "wantChangeXXX" message.
                // json.name = ...
                // json.color = ...
            }

            g_players[json.pid] = new Player(json.pid, json.name, json.color, json.canplay)
        } else {
            // An existing player? Change its settings.
            g_players[json.pid].changeName(json.name)
            g_players[json.pid].changeColor(json.color)
        }

        //in any case, update points scored/turns taken display
        g_players[json.pid].updateTurns(json.turns)
        g_players[json.pid].updatePoints(json.points)
    } else if ( json.msg == "leaver" ) {
        g_scoreboard.leaver(json.pid)
        delete g_players[json.pid]
        g_scoreboard.showInvite(true)
    } else if ( json.msg == "canplay" ) {
        g_players[json.pid].changeCanPlay(json.canplay)
    } else if ( json.msg == "points" ) {
        g_players[json.pid].updatePoints(json.points)
    } else if ( json.msg == "turns" ) {
        g_players[json.pid].updateTurns(json.turns)
    } else if ( json.msg == "chat" ) {
        g_chat.message(json.from, json.content)
    } else if ( json.msg == "end" ) {
        g_scoreboard.gameOver(json.winner)
    } else if ( json.msg == "err_gameid" ) {
        errmsg = encodeURIComponent("The game you want to join (id: <b>" + json.gid + "</b>) doesn't exist!")
        window.location.replace("/?errmsg=" + errmsg)
    } else if ( json.msg == "err_gamefull" ) {
        errmsg = encodeURIComponent("The game you want to join (id: <b>" + json.gid + "</b>) is already full! It allows a <b>maximum of " + json.max + "</b> players.")
        window.location.replace("/?errmsg=" + errmsg)
    }
}

function sendMessage(msg) {
    console.log('Snd: ' + msg)
    conn.send(msg)
}

$(document).ready(function() {
    init()
    connect()
})
