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

### card
x,y are the top left corner of the card.
phi is the angle in degrees.

If the type changes from something to -1 (i.e. it flips closed),
the client side needs to show the closing animation only 1-2 seconds later.
This is necessary for the case of the second card being opened and not matching
the first card, so that everyone has enough time to see the second card.
```javascript
{
		"msg": "card"
    "id": 13,
    "x": 124,
    "y": 234,
    "phi": 0.03,
    "type": -1
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

### playermsg
```javascript
{
		"msg":			"player"
		"id":				13,
		"name":			"Bob",
		"canPlay":	true,
    "points": 	9001
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
