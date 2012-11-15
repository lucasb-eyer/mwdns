package main

import (
	"fmt"
	"log"
	"strconv"
	"bytes"
	"code.google.com/p/go.net/websocket"
	"container/list"
	"encoding/json"
)

const (
	NO_TYPE = -1
)

func (p *Player) reader() {
	for {
		var message string
		err := websocket.Message.Receive(p.ws, &message)
		if err != nil {
			log.Println("Got a socket read error: ", err)
			break
		}

		log.Println("Message from websocket! ", message)

		msgReader := bytes.NewReader([]byte(message))
		dec := json.NewDecoder(msgReader)
		var metaMessage map[string]string

		if err := dec.Decode(&metaMessage); err != nil {
			log.Fatalln("JSON decode error:", err)
		}

		//process each single message, depending on the type key
		for k, v := range metaMessage {
			switch k {
			case "wantFlip": //TODO: implement in client
				cardid, err := strconv.Atoi(v)
				if err != nil {
					log.Fatal("Invalid cardid ", v)
				}
				log.Println("Want to flip card ", cardid)

				p.Game.TryFlip(p, cardid)
			case "chat":
				log.Println("got chat message: ", v)
				p.Game.Chat(fmt.Sprintf("%v", p.Id), v)
			default:
				log.Println("Unknown message type: '", k, "' value: ", v)
			}
		}
	}
	p.ws.Close()
}

func (p *Player) writer() {
	for message := range p.send {
		err := websocket.Message.Send(p.ws, message)
		if err != nil {
			log.Println("Got a socket write error: ", err)
			break
		}
	}
	p.ws.Close()
}

type Player struct {
	Id      int
	CanPlay bool //TODO: set this through a player method, so the player is always notified
	Points  int
	Game    *Game

	Name		string
	openCard int // -1 if no card is opened yet, a card id if a card was already opened

	ws *websocket.Conn
	// Buffered channel of outbound messages.
	send chan string
}

func (p *Player) GetJsonPlayer() string {
	return fmt.Sprintf(`{"msg": "player", "id": %v, "name": %v, "canPlay": %v, "points": %v}`,p.Id,p.Name,p.CanPlay,p.Points)
}

func (p *Player) SetCanPlay(v bool, g *Game) {
	p.CanPlay = v
	//notify the respective player with a message
	//everybody else too
	g.Broadcast(p.GetJsonPlayer())
}

type Card struct {
	Id   int
	X    int
	Y    int
	Phi  float64
	IsOpen bool
	Type int
}

func (c *Card) GetJsonCard() string {
	Type := NO_TYPE
	if c.IsOpen {
		Type = c.Type
	}

	return fmt.Sprintf(`{"msg": "card", "id": %v, "x": %v, "y": %v, "phi": %v, "type": %v}`, c.Id, c.X, c.Y, c.Phi, Type)
}

func NewGame(cardCount int) *Game {
	//TODO: set game type?
	g := new(Game)
	//g.Players = make(map[int]*Player)
	g.Players.Init()
	g.Cards = make(map[int]*Card)
	g.cardCountLeft = cardCount

	g.registerPlayer = make(chan *Player)
	g.unregisterPlayer = make(chan *Player)
	g.incomingPlayerMessages = make(chan string)

	for i := 0; i < cardCount; i++ {
		c := Card{
			Id:   i,
			X:    i * 20,
			Y:    0,
			Phi:  0,
			Type: i / 2,
			IsOpen: false}

		g.Cards[i] = &c
	}

	return g
}

const (
	GAME_TYPE_CLASSIC = iota
	GAME_TYPE_RUSH

	NO_CARD = -1
)

type Game struct {
	Players     list.List
	maxPlayerId int
	Cards       map[int]*Card
	cardCountLeft int //how many cards are still playable

	Type int

	registerPlayer         chan *Player
	unregisterPlayer       chan *Player
	incomingPlayerMessages chan string
}

//TODO: actually do something with the channels
func (g *Game) AddPlayer(p *Player) {
	g.registerPlayer <- p
}
func (g *Game) RemovePlayer(p *Player) {
	//TODO: remove player - actually process the chan?
	g.unregisterPlayer <- p
}

// send a string to all players
func (g *Game) Broadcast(m string) {
	for e := g.Players.Front(); e != nil; e = e.Next() {
		p := e.Value.(*Player)
		p.send <- m
	}
}

func (g *Game) BroadcastPlayerStates() {
	for e := g.Players.Front(); e != nil; e = e.Next() {
		g.Broadcast(e.Value.(*Player).GetJsonPlayer())
	}
}

//TODO: handle client message "wantChangeName"
//TODO: send out server message "end" which indicates the end of the game
// preceded or followed by all player states

func (g *Game) Run() {
	for {
		select {
		//TODO: obscure cases can be checked here: if the player already disconnected etc
		case p := <-g.registerPlayer:
			//send current board state to player
			p.Id = g.maxPlayerId
			p.Name = "Nobody" //TODO: set the name?
			p.openCard = NO_CARD
			p.Game = g

			switch g.Type {
			case GAME_TYPE_CLASSIC:
				// the first player? you can play then.
				if g.Players.Len() == 0 {
					p.SetCanPlay(true,g)
				} else {
					p.SetCanPlay(false,g)
				}
			case GAME_TYPE_RUSH:
				p.SetCanPlay(true,g)
			default:
				log.Fatalln("Unknown game type in game.Run:", g.Type)
			}
			g.Players.PushBack(p)
			g.maxPlayerId++

			g.SendInitBoard(p)
			g.SendBoardState(p)
		case p := <-g.unregisterPlayer:
			//TODO: check if it actually is in the list etc PROPER ERROR HANDLING
			for e := g.Players.Front(); e != nil; e = e.Next() {
				if e.Value.(*Player) == p {
					g.Players.Remove(e)
					break
				}
			}
			//TODO: gamelogic, if 0 players: delete game etc
		}
	}
}

func (g *Game) TryFlip(p *Player, cardid int) {
	// cease the funny stuff
	if !p.CanPlay || g.Cards[cardid].IsOpen {
		return
	}

	switch g.Type {
	case GAME_TYPE_CLASSIC:
		g.Cards[cardid].IsOpen = true
		g.Broadcast(g.Cards[cardid].GetJsonCard())

		if p.openCard == NO_CARD {
			p.openCard = cardid
		} else {
			// same card type? One point for the gentleman over there!
			if g.Cards[p.openCard].Type == g.Cards[cardid].Type {
				//SCOOORE!
				p.Points++
				g.cardCountLeft-=2

				if g.cardCountLeft == 0 {
					//game over, broadcast player states, send out end message
					g.BroadcastPlayerStates()
					g.Broadcast(`{"msg": "end"}`)
				}

				//broadcast points - tell EVERYBODY
				g.BroadcastPlayerStates()
			} else {
				// close those cards again! //TODO: check if the cards are not already closed?
				g.Cards[cardid].IsOpen = false
				g.Broadcast(g.Cards[cardid].GetJsonCard())
				g.Cards[p.openCard].IsOpen = false
				g.Broadcast(g.Cards[p.openCard].GetJsonCard())

				// aww, no match. Next player please.
				p.SetCanPlay(false,g)

				// iterate over the list to find the next player and tell him to play
				for e := g.Players.Front(); e != nil; e = e.Next() {
					if e.Value.(*Player) == p {
						var nextPlayer *Player
						if e == g.Players.Back() {
							nextPlayer = g.Players.Front().Value.(*Player)
						} else {
							nextPlayer = e.Next().Value.(*Player)
						}
						nextPlayer.SetCanPlay(true,g)
						break
					}
				}
			}

			p.openCard = NO_CARD
		}
	case GAME_TYPE_RUSH:
		log.Fatal("Not implemented that game type yet")
	default:
		log.Fatal("Wut (unknown game type)")
	}
}

func (g *Game) Chat(pname, msg string) {
	g.Broadcast(fmt.Sprintf(`{"msg": "chat", "from": "%v", "content": "%v"}`, pname, msg))
}

// sends a board state to a player (ALL the cards)
func (g *Game) SendBoardState(p *Player) {
	for _, val := range g.Cards {
		p.send <- val.GetJsonCard()
	}
}

func (g *Game) SendInitBoard(p *Player) {
	p.send <- fmt.Sprintf(`{"msg": "initBoard", "cardCount": %v}`,len(g.Cards))
}
