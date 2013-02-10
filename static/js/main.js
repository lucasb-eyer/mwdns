var conn

function connect() {
	var messagesCount = 0;
	if (window["WebSocket"]) {
		// parse current url parameters
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			vars[key] = value;
		});
		var g = vars["g"]

		//connect to the current host/port combination
		var address = "ws://"+window.location.hostname+":"+window.location.port+"/ws?g="+g
		conn = new WebSocket(address);
		conn.onclose = function(evt) {
			console.log(evt) //DEBUG
		}
		conn.onmessage = function(evt) {
			console.log("Msg:" + evt.data) //DEBUG
			handleMessage(evt.data);
		}
	} else {
		console.log("Your browser does not support WebSockets.")
	}
}

function handleMessage(msg){
	var json = jQuery.parseJSON(msg);
	if ( json.msg == "initBoard" ) {
		// TODO: Board-size dependent on the client's window size?
		// TODO: Card-size dependent on the assets?
		// TODO: the board size can be computed to fit the card grid
		createBoard(DEFAULT_BOARD_W, DEFAULT_BOARD_H, DEFAULT_CARD_W, DEFAULT_CARD_H)
		createCards(json.cardCount)
	} else if ( json.msg == "cardMove" ) {
		gameCards[json.id].moveTo(json.x, json.y, json.phi)
	} else if ( json.msg == "cardFlip" ) {
		gameCards[json.id].flipCard(json.type, json.scoredBy)
	} else if ( json.msg == "newplayer" ) {
		// TODO: The server should give the player a color too!
		g_players[json.pid] = new Player(json.pid, undefined, undefined, json.canplay)
		if ( json.itsyou ) {
			g_mypid = json.pid

			// broadcast your chosen/generated color/name
			conn.send('{"wantChangeColor": "'+g_players[json.pid].color+'"}');
			conn.send('{"wantChangeName": "'+g_players[json.pid].name+'"}');
		}
	} else if ( json.msg == "leaver" ) {
		g_scoreboard.leaver(json.pid)
		g_players[json.pid] = undefined
	} else if ( json.msg == "playerinfo" ) {
		//trust that the server already has cleared up any possible messes
		g_players[json.pid].changeName(json.name);
		g_players[json.pid].changeColor(json.color);
	} else if ( json.msg == "canplay" ) {
		g_players[json.pid].changeCanPlay(json.canplay)
	} else if ( json.msg == "points" ) {
		g_players[json.pid].updatePoints(json.points)
	} else if ( json.msg == "end" ) {
		//TODO: display final game screen (scores, winner, new game)
	}
}

$(document).ready(function() {
	init()
	connect()
})
