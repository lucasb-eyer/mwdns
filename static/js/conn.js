var conn

var zalando = new Array();
var x = 0;
var y = 0;

$.ajax({
           url: 'http://www.zalando.de/schuhe/',
           type: 'GET',
		   dataType:'html',
           success: function(res) {
             $(res.responseText).find('.gItem .productBox img').each(function(index) {
				 if (index > 9){
					 return false;
				 }
    			 zalando[index] = $(this).attr('longdesc');
				 x = x+1;
			 });
           }
         });

function connect() {
	var messagesCount = 0;
	if (window["WebSocket"]) {
		console.log("Connecting to websocket.")
		// parse url parameters
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			vars[key] = value;
		});
		var g = vars["g"]
		console.log("g value: " + g)

		//var address = "ws://localhost/ws?g="+g
		var address = "ws://"+window.location.hostname+":"+window.location.port+"/ws?g="+g
		conn = new WebSocket(address);
		console.log(address)
		conn.onclose = function(evt) {
			console.log("Connection closed.")
			console.log(evt)
		}
		conn.onmessage = function(evt) {
			console.log("Got a message! (see next line)");
			console.log(evt.data);
			handleMessage(evt.data);
		}
	} else {
		console.log("Your browser does not support WebSockets.")
	}
}

connect();

function chat(msg) {
	conn.send('{ "chat": "' + msg + '" }');
}


function addClickHandler(i){
	$("#card_"+i).click(function(){
		conn.send('{\"wantFlip\": \"'+i+'\"}');
	})
}

function handleMessage(msg){
	var json = jQuery.parseJSON(msg);
	console.log(json)
	if ( json.msg == "initBoard" ){
		for (var i=0;i<json.cardCount;i++)
		{
			var top = i*3+50;
			var left = i*3+10;
			$('#cardContainer').append('<div id="card_'+i+'"  class="flip_card card-boarder" style="top:'+top+'px; left:'+left+'px; " ></div>');
			$("#card_"+i).html($("#cardBackContent").html());
			addClickHandler(i);
			

		}
	} else if ( json.msg == "cardMove" ){
		$('#card_'+json.id).animate({
			 left: json.x,
			 top: json.y,
		}, 1000, function() {});
	} else if ( json.msg == "cardFlip" ){
		if (json.type > -1){
			var flippingCard = $('#card_'+json.id);
			flipCardFront(flippingCard,json)
		}
		if (json.type == -1){
			var flippingCard = $('#card_'+json.id);
			setTimeout(function(){flipCardBack(flippingCard,json)}, 1000)
		}
	} else if ( json.msg == "player" ){
	}
}

function flipCardFront(card,json) {
	card.html($("#cardContent").html())
	$("#cardContent").find("img").attr("src",zalando[json.type])
/*
    	 			flippingCard.flippy({
						content:$("#cardContent"),
						direction:"LEFT",
						duration:"350",
						onStart:function(){
							flippingCard.removeClass('card-boarder')
							$("#cardContent img").attr('src',zalando[y]);
							if (y <= x){
								y = y + 1;
							}
						},
						onFinish:function(){
							flippingCard.addClass('card-boarder');
						}
					});
*/
}

function flipCardBack(card,json) {
	card.html($("#cardBackContent").html())
/*
			var cont = $("#cardBackContent")
			var flippingCard = $('#card_'+json.id);
    	 			flippingCard.flippy({
						content:cont,
						direction:"LEFT",
						duration:"350",
						onStart:function(){
							flippingCard.removeClass('card-boarder')
							$("#cardContent img").attr('src','1');
						//if (y <= x){
							//y = y + 1;
						//}
						},
						onFinish:function(){
							flippingCard.addClass('card-boarder');
						}
					});
*/
}
