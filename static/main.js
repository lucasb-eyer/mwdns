var conn

function connect() {
	if (window["WebSocket"]) {
		console.log("Connecting to websocket.")
		// parse url parameters
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			vars[key] = value;
		});
		var g = vars["g"]
		console.log("g value: " + g)

		var address = "ws://localhost:8080/ws?g="+g
		conn = new WebSocket(address);
		console.log(address)
		conn.onclose = function(evt) {
			console.log("Connection closed.")
			console.log(evt)
		}
		conn.onmessage = function(evt) {
			console.log("Got a message! (see next line)");
			console.log(evt.data);
		}
	} else {
		console.log("Your browser does not support WebSockets.")
	}
}

connect();

function chat(msg) {
	conn.send('{ "chat": "' + msg + '" }');
}
