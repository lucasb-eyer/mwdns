Positions and coordinates
=========================
Coordinate-system is the javascript one, (0,0) being top left, x increasing towards the right, y increasing towards the bottom.

Client-side (js), all positions are stored in pixels.
In the messages aswell as on the server (go), all positions are relative in % of game board size, i.e. between 0.0 and 1.0 if on the board.

Message types
=============
The messages sent through the websockets during a game.

Server to client
----------------
### initBoard
```javascript
{
	"msg": "initBoard"
	"cardCount": 13
}
```

### cardMove
x,y are the center of the card as a relative (%) position on the board.
phi is the angle in degrees.
```javascript
{
	"msg": "cardMove",
	"id": 13,
	"x": 0.13,
	"y": 0.52,
	"phi": 0.03,
}
```

### cardFlip
Type is the "picture" on the card ; you could also call it "class" if you prefer.
If the type changes from something to -1 (i.e. the card flips closed),
the client side needs to show the closing animation 1-2 seconds later.
This is necessary for the case of the second card being opened and not matching
the first card, so that everyone has enough time to see both card.

If the card happened to be already scored the scoring player id is saved in "scoredBy"
```javascript
{
	"msg": "cardFlip",
	"id": 13,
	"type": -1,
	"scoredBy": -1
}
```

### chatmsg
```javascript
{
	"msg": "chat",
	"from": "luck.duck",
	"content": "gg n00bs"
}
```

### points
```javascript
{
	"msg": "points",
	"pid": 13,
	"points": 9001
}
```

### player
This message is sent both whenever a new player joins and when a player changes his name or color.
```javascript
{
	"msg": "player",
	"pid": 13,
	"itsyou": false
	"name": "Bob"
	"color": "#F00"
}
```

### leaver
```javascript
{
	"msg": "leaver",
	"pid": "13"
}
```

### canplay
```javascript
{
	"msg": "canplay",
	"pid": 13,
	"canPlay": false
}
```

### endgamemsg
```javascript
{
	"msg": "end"
}
```

### errors

#### err\_gameid
```javascript
{
	"msg": "err_gameid",
	"gid": "XZejbF"
}
```

#### err\_gamefull
```javascript
{
	"msg": "err_gamefull",
	"gid": "FooBar",
	"max": 10
}
```

Client to server
----------------

### wantFlip
A client can send this to the server whenever it wants to flip OPEN a card. There will be no answer.
The client should wait to get a "flipped" message, or nothing ever.
```javascript
{
	"wantFlip": "13"
}
```

### chatmsg
```javascript
{
	"chat": "gl, hf"
}
```

### wantChangeName
```javascript
{
	"wantChangeName": "Bob"
}
```

### wantChangeColor
```javascript
{
	"wantChangeColor": "#F00"
}
```

### moveCard
```javascript
{
	"moveCard": {
		"id": 13,
		"x": 0.25,
		"y": 0.043,
		"phi": 120
	}
}
```
