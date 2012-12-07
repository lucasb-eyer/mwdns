//the loading screen that will display while our assets load
Crafty.scene("loading", function () {
	//load takes an array of assets and a callback when the preloading is complete
	Crafty.load(assets, function () {
			initAssets()

			//when everything is loaded, run the main scene
			//enterprise edition: it takes longer because it was expensive (also because I want to see how the loading screen looks)
			//window.setTimeout(function() {Crafty.scene("main");}, 3*1000)
			Crafty.scene("main");
	});
	
	//black background with some loading text
	//Crafty.background("#FFF");
	Crafty.e("2D, DOM, Text").attr({ w: 200, h: 40, x: WIDTH/2-100, y: HEIGHT/2-20})
	        .text("Loading")
	        .css({"text-align": "center", "color": "white", "font-size": "40px"});
});

Crafty.scene("main", function () {
	connect() //connect websocket to the server when we are ready to show the board
});
