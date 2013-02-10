package main

import (
	"bytes"
	"code.google.com/p/go.net/websocket"
	"container/list"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"regexp"
	"strconv"
	"strings"
)

const (
	NO_TYPE   = -1
	NO_PLAYER = -1
)

type cardPosition struct {
	Id  int
	X   float64
	Y   float64
	Phi float64
}

func (p *Player) reader() {
	for {
		var message string
		err := websocket.Message.Receive(p.ws, &message)
		if err == io.EOF {
			log.Println("Client closed the connection.")
			break
		} else if err != nil {
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

		//TODO: unmarshal errors here crash the server, rather drop invalid messages: logging, but otherwise ignoring them
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
			case "moveCard":
				//TODO: REALLY take care of malformed incoming messages... this sucks (server crashes)
				//TODO: v looks wrong here? -> server crashes
				content := strings.Replace(v, "'", "\"", -1) //decode makeshift json encoding

				contentReader := strings.NewReader(content)
				dec := json.NewDecoder(contentReader)
				var cardpos cardPosition
				if err := dec.Decode(&cardpos); err != nil {
					log.Fatalln("JSON decode error in moveCard:", err)
				}
				p.Game.MoveCard(cardpos)
			case "wantChangeName":
				//TODO: check if this is a name, escape for the sake of all that is paranoid
				p.Name = v
				p.Game.Broadcast(p.GetJsonPlayerInfo())
			case "wantChangeColor":
				//TODO: check if this is a valid color
				if matched, err := regexp.MatchString("^#[0-9A-Fa-f]{3,6}$", v); err != nil || !matched {
					log.Fatal("Invalid color ", v)
				} else {
					p.Color = v
					p.Game.Broadcast(p.GetJsonPlayerInfo())
				}
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

	Name     string
	Color    string
	openCard int // -1 if no card is opened yet, a card id if a card was already opened

	// For the combo
	PreviousWasGood bool

	ws *websocket.Conn
	// Buffered channel of outbound messages.
	send chan string
}

func (p *Player) GetJsonCanPlay() string {
	return fmt.Sprintf(`{"msg": "canplay", "pid": %v, "canplay": %v}`, p.Id, p.CanPlay)
}

func (p *Player) SetCanPlay(v bool, g *Game) {
	p.CanPlay = v
	//notify the respective player with a message and everybody else too
	g.Broadcast(p.GetJsonCanPlay())
}

func (p *Player) GetJsonNew(itshim bool) string {
	return fmt.Sprintf(`{"msg": "newplayer", "pid": %v, "canplay": %v, "itsyou": %v}`, p.Id, p.CanPlay, itshim)
}

func (p *Player) GetJsonPlayerInfo() string {
	return fmt.Sprintf(`{"msg": "playerinfo", "pid": %v, "name": "%v", "color": "%v"}`, p.Id, p.Name, p.Color)
}

type Card struct {
	Id     int
	X      float64
	Y      float64
	Phi    float64
	IsOpen bool
	Type   int

	ScoredBy int //the playerid, denoting to whom the points go
}

func (c *Card) GetJsonCardMove() string {
	return fmt.Sprintf(`{"msg": "cardMove", "id": %v, "x": %v, "y": %v, "phi": %v}`, c.Id, c.X, c.Y, c.Phi)
}

func (c *Card) GetJsonCardFlip() string {
	Type := NO_TYPE
	if c.IsOpen {
		Type = c.Type
	}

	return fmt.Sprintf(`{"msg": "cardFlip", "id": %v, "type": %v, "scoredBy": %v}`, c.Id, Type, c.ScoredBy)
}

func (c *Card) GetJsonCardFlipAlways() string {
	return fmt.Sprintf(`{"msg": "cardFlip", "id": %v, "type": %v, "scoredBy": %v}`, c.Id, c.Type, c.ScoredBy)
}

func NewGame(cardCount, gameType int) *Game {
	g := new(Game)
	g.Players.Init()
	g.Type = gameType
	g.Cards = make(map[int]*Card)
	g.cardCountLeft = cardCount

	// the size is padded client size, so the cards are always completely visible (eg +cardDim/2 at sides)
	//TODO: to position the cards, the server would need to know the card size? (or we keep it fix)

	g.registerPlayer = make(chan *Player)
	g.unregisterPlayer = make(chan *Player)
	g.incomingPlayerMessages = make(chan string)

	shuffling_aux := rand.Perm(cardCount)

	// We'll use a grid-layout for now.
	// in fact this could be formulated as a circle packing problem.
	ncardsx := (int)(math.Ceil(math.Sqrt((float64)(cardCount))))
	ncardsy := (int)(math.Floor(math.Sqrt((float64)(cardCount))))
	for i := 0; i < cardCount; i++ {
		c := Card{
			Id:       i,
			X:        (float64)(i%ncardsx) / (float64)(ncardsx-1),
			Y:        (float64)(i/ncardsx) / (float64)(ncardsy-1),
			Phi:      0, //(float64)(rand.Intn(2*360) - 360), //no rotation for now
			Type:     shuffling_aux[i] / 2,
			IsOpen:   false,
			ScoredBy: NO_PLAYER}

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
	Players       list.List
	maxPlayerId   int
	Cards         map[int]*Card
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

//TODO: handle client message "wantChangeName"
//TODO: handle client message "wantChangeColor"

func (g *Game) Run() {
	for {
		select {
		//TODO: obscure cases can be checked here: if the player already disconnected etc
		case p := <-g.registerPlayer:
			//send current board state to player
			p.Id = g.maxPlayerId
			p.Name = "Anon" //TODO: set the name?
			p.Color = Rgb2Hex(HappyColor()) //TODO: check for color clash?
			p.openCard = NO_CARD
			p.Game = g

			// Note that we set CanPlay directly to avoid sending messages
			// about a not-yet existing player to the client.
			switch g.Type {
			case GAME_TYPE_CLASSIC:
				// the first player? you can play then.
				if g.Players.Len() == 0 {
					p.CanPlay = true
				} else {
					p.CanPlay = false
				}
			case GAME_TYPE_RUSH:
				p.CanPlay = true
			default:
				log.Fatalln("Unknown game type in game.Run:", g.Type)
			}
			// Send the new player to all other players (i.e. before adding him to the players list)
			g.Broadcast(p.GetJsonNew(false))
			g.Players.PushBack(p)
			g.maxPlayerId++

			g.SendInitBoard(p)
			g.SendPlayers(p) // Now send him all existing players (including himself)
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

// Yeah, this is a God-method containing almost all game-logic... It's a hack.
func (g *Game) TryFlip(p *Player, cardid int) {
	// cease the funny stuff
	if g.Cards[cardid].IsOpen || !p.CanPlay || p.openCard == cardid {
		return
	}

	if g.Type == GAME_TYPE_CLASSIC {
		// In classic mode, every player sees the cards one flips right away.
		g.Cards[cardid].IsOpen = true
		g.Broadcast(g.Cards[cardid].GetJsonCardFlip())
	} else if g.Type == GAME_TYPE_RUSH {
		// In rush mode, only the player opening the card sees it, others don't.
		// This is achieved by sending only that player the card type, but not
		// marking it as opened in general.
		p.send <- g.Cards[cardid].GetJsonCardFlipAlways()
	}

	// If this is the first card the player opens, that's it! But also keep track of it.
	if p.openCard == NO_CARD {
		p.openCard = cardid
		return
	}

	// Second card opened...
	firstCard := g.Cards[p.openCard]
	secondCard := g.Cards[cardid]
	p.openCard = NO_CARD // Whatever happens, this player won't have an open card anymore
	if firstCard.Type != secondCard.Type {
		// Too bad
		p.PreviousWasGood = false

		if g.Type == GAME_TYPE_CLASSIC {
			// close the cards again. (Only in classic)
			firstCard.IsOpen = false
			secondCard.IsOpen = false
			// In the classic mode, we need to close both card for everyone.
			g.Broadcast(firstCard.GetJsonCardFlip())
			g.Broadcast(secondCard.GetJsonCardFlip())

			// And then switch to the next player.
			p.SetCanPlay(false, g)
			g.CyclicNextPlayer(p).SetCanPlay(true, g)
		} else if g.Type == GAME_TYPE_RUSH {
			// In rush mode, we only need to tell the current player to unflip the cards.
			p.send <- firstCard.GetJsonCardFlip()
			p.send <- secondCard.GetJsonCardFlip()
		}

	} else {
		//SCOOORE!
		p.Points++
		g.cardCountLeft -= 2

		// make the card remember who scored
		firstCard.ScoredBy = p.Id
		secondCard.ScoredBy = p.Id

		// In rush mode, open the two cards for EVERYBODY now!
		if g.Type == GAME_TYPE_RUSH {
			firstCard.IsOpen = true
			secondCard.IsOpen = true
			g.Broadcast(firstCard.GetJsonCardFlip())
			g.Broadcast(secondCard.GetJsonCardFlip())

			// Check for combo, i.e. successful opening twice.
			if p.PreviousWasGood {
				p.Points++
				g.Broadcast(`{"msg": "combo"}`)

				// Shuffle some random cards around randomly.
				for k, _ := range g.Cards {
					if rand.Intn(5) == 0 {
						g.MoveCard(cardPosition{Id: k, X: rand.Float64(), Y: rand.Float64(), Phi: (float64)(rand.Intn(2*360) - 360)})
					}
				}
			}
		} else {
			//we need to broadcast the card owner anyway
			g.Broadcast(firstCard.GetJsonCardFlip())
			g.Broadcast(secondCard.GetJsonCardFlip())
		}

		p.PreviousWasGood = true
		p.openCard = NO_CARD

		//broadcast points - tell EVERYBODY
		g.Broadcast(fmt.Sprintf(`{"msg": "points", "pid": %v, "points": %v}`, p.Id, p.Points))

		// gg?
		if g.cardCountLeft == 0 {
			// TODO: necessary to broadcast more?
			g.Broadcast(fmt.Sprintf(`{"msg": "end", "winner": "%v"}`, p.Id))
		}
	}
}

func (g *Game) MoveCard(cardp cardPosition) {
	card := g.Cards[cardp.Id]
	//TODO: is this necessary? trololoyes
	// limit the card position to an area on/around the board -> clamp with padding
	//TODO: g.BoardSizeX-g.CardSizeX should be a derived value...
	card.X = math.Min(math.Max(0.0, cardp.X), 1.0)
	card.Y = math.Min(math.Max(0.0, cardp.Y), 1.0)
	card.Phi = cardp.Phi
	g.Broadcast(card.GetJsonCardMove())
}

func (g *Game) Chat(pname, msg string) {
	g.Broadcast(fmt.Sprintf(`{"msg": "chat", "from": "%v", "content": "%v"}`, pname, msg))
}

// sends a board state to a player (ALL the cards)
func (g *Game) SendBoardState(p *Player) {
	for _, val := range g.Cards {
		p.send <- val.GetJsonCardMove()
		p.send <- val.GetJsonCardFlip()
	}
}

func (g *Game) SendInitBoard(p *Player) {
	p.send <- fmt.Sprintf(`{"msg": "initBoard", "cardCount": %v}`, len(g.Cards))
}

func (g *Game) SendPlayers(towhom *Player) {
	// Sends a newplayer message to "towhom" for every player in the game
	for e := g.Players.Front(); e != nil; e = e.Next() {
		p := e.Value.(*Player)
		towhom.send <- p.GetJsonNew(p == towhom)
		// if about another player: send the established color and name
		//TODO: strange things can happen here if people log in simultaneously
		if p != towhom {
			towhom.send <- p.GetJsonPlayerInfo()
		}
	}
}

func (g *Game) CyclicNextPlayer(from *Player) *Player {
	// Returns the next player cycling through the list, or himself.
	for e := g.Players.Front(); e != nil; e = e.Next() {
		if e.Value.(*Player) == from {
			var nextPlayer *Player
			if e == g.Players.Back() {
				nextPlayer = g.Players.Front().Value.(*Player)
			} else {
				nextPlayer = e.Next().Value.(*Player)
			}
			return nextPlayer
		}
	}

	return from
}

