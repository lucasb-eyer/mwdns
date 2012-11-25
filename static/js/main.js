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

var MOVEMENT_SPEED = 50

function handleMessage(msg){
	var json = jQuery.parseJSON(msg);
	if ( json.msg == "initBoard" ) {
		createCards(json.cardCount)
	} else if ( json.msg == "cardMove" ) {
		//move respective card (json.id)
		cards[json.id].tween({x: json.x, y:json.y, rotation: json.phi}, MOVEMENT_SPEED)
	} else if ( json.msg == "cardFlip" ) {
		//TODO: flip cards
		//cards[json.id].image(cardSource.getCardImg(json.id))
	} else if ( json.msg == "player" ) {
		//TODO: what was this one again?
	} else if ( json.msg == "end" ) {
		//TODO: display final game screen (scores, winner, new game)
	}
}

$(document).ready(function() {
	init()
})
