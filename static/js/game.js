//nice tutorial: http://craftyjs.com/tutorial/bananabomber/create-a-game
var WIDTH  = 500
	, HEIGHT = 500

var assetPrefix = "/static/img/assets/"
var assets = ["house-of-cards-back.jpg"]
assets = assets.map(function(o) {return assetPrefix+o})

function initBoard() {
	//set game display to the full window
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	//TODO: resize handler

	//start crafty
	Crafty.init(WIDTH, HEIGHT)
	//Crafty.canvas.init(); //to use a canvas instead of dom elements (slower)

	Crafty.scene("loading")
}

function createCards(cardCount) {
	for (var i=0; i<cardCount; i++)
	{
		//create crafty game object
		
		/*
		var top = i*3+50;
		var left = i*3+10;
		$('#cardContainer').append('<div id="card_'+i+'"  class="flip_card card-boarder" style="top:'+top+'px; left:'+left+'px; " ></div>');
		$("#card_"+i).html($("#cardBackContent").html());
		addClickHandler(i);
		*/
	}
}

