var conn

var zalando = new Array();
var zalandoLinks = new Array();
var zalandoNames = new Array();

$(document).ready(function() {
	$.ajax({
		url: 'http://www.zalando.de/schuhe/',
		type: 'GET',
		dataType:'html',
		success: function(res) {
			$(res.responseText).find('.gItem .productBox').each(function(index,object) {
				if (index > 9){
				 return false;
				}
	
				zalandoLinks[index] = $(object).attr('href');
			});

			$(res.responseText).find('.gItem .productBox img').each(function(index,object) {
				if (index > 9){
				 return false;
				}
	
				zalando[index] = $(object).attr('longdesc');
				zalandoNames[index] = $(object).attr('title');
			});
		}
	});
})

function connect() {
	var messagesCount = 0;
	if (window["WebSocket"]) {
		// parse url parameters
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			vars[key] = value;
		});
		var g = vars["g"]

		//var address = "ws://localhost/ws?g="+g
		var address = "ws://"+window.location.hostname+":"+window.location.port+"/ws?g="+g
		conn = new WebSocket(address);
		conn.onclose = function(evt) {
			console.log(evt)
		}
		conn.onmessage = function(evt) {
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
		$('#card_'+json.id).css('-webkit-transform','rotate('+json.phi+'deg)'); 
		$('#card_'+json.id).css('-moz-transform','rotate('+json.phi+'deg)'); 
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
	$(card).find("img").attr("src",zalando[json.type])
	$(card).find(".informativeText").html("<a href='http://www.zalando.de/"+zalandoLinks[json.type]+"'>"+zalandoNames[json.type]+"</a>")
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
>>>>>>> 25de5acf1758f22bd831901ac81a67f417e60970
