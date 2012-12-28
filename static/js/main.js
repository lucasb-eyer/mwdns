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
		createBoard(json.boardSizeX, json.boardSizeY, json.cardSizeX, json.cardSizeY)
		createCards(json.cardCount)
	} else if ( json.msg == "cardMove" ) {
		gameCards[json.id].moveTo(json.x, json.y, json.phi)
	} else if ( json.msg == "cardFlip" ) {
		gameCards[json.id].flipCard(json.type)
	} else if ( json.msg == "newplayer" ) {
		// TODO: The server should give the player a color too!
		g_players[json.pid] = new Player(json.pid, json.name, undefined, json.canplay)
		if ( json.itsyou ) {
			g_mypid = json.pid
		}
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
