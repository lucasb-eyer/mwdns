package game

import (
    "bytes"
    "code.google.com/p/go.net/websocket"
    "container/list"
    "encoding/json"
    "fmt"
    "github.com/lucasb-eyer/go-colorful"
    "io"
    "log"
    "math"
    "math/rand"
    "strconv"
    "strings"
    "time"

    "github.com/lucasb-eyer/mwdns/utils"
)

const (
    NO_TYPE   = -1
    NO_PLAYER = -1
)

type Player struct {
    Id      int
    CanPlay bool //TODO: set this through a player method, so the player is always notified
    Points  int
    Turns   int  //Rush Turns == # of flips != Classic Turns
    Flips   int
    Game    *Game

    Name     string
    Color    colorful.Color
    openCard int // -1 if no card is opened yet, a card id if a card was already opened

    // For the combo
    PreviousWasGood bool

    ws *websocket.Conn
    // Buffered channel of outbound messages.
    send chan string
}

func NewPlayer(ws *websocket.Conn) *Player {
    return &Player{
        CanPlay: false,
        Points:  0,

        // create socket connection
        send: make(chan string, 256),
        ws:   ws,
    }

}

type cardPosition struct {
    Id  int
    X   float64
    Y   float64
    Phi float64
}

func (p *Player) Reader() {
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
                p.Game.BroadcastPlayer(p)
            case "wantChangeColor":
                if col, err := colorful.Hex(v); err != nil {
                    log.Fatal("Invalid color ", v)
                } else {
                    p.Color = col
                    p.Game.BroadcastPlayer(p)
                }
            default:
                log.Println("Unknown message type: '", k, "' value: ", v)
            }
        }
    }
    p.ws.Close()
}

func (p *Player) Writer() {
    for message := range p.send {
        err := websocket.Message.Send(p.ws, message)
        if err != nil {
            log.Println("Got a socket write error: ", err)
            break
        }
    }
    p.ws.Close()
}

func (p *Player) GetJsonCanPlay() string {
    return fmt.Sprintf(`{"msg": "canplay", "pid": %v, "canplay": %v}`, p.Id, p.CanPlay)
}

func (p *Player) SetCanPlay(v bool, g *Game) {
    p.CanPlay = v
    //notify the respective player with a message and everybody else too
    g.Broadcast(p.GetJsonCanPlay())
}

func (p *Player) GetJsonPlayer(itshim bool) string {
    name, _ := json.Marshal(p.Name)
    return fmt.Sprintf(`{"msg": "player", "pid": %v, "canplay": %v, "itsyou": %v, "name": %v, "color": "%v", "points": %v, "flips": %v, "turns": %v}`, p.Id, p.CanPlay, itshim, string(name), p.Color.Hex(), p.Points, p.Flips, p.Turns)
}

func (p *Player) GetJsonLeave() string {
    return fmt.Sprintf(`{"msg": "leaver", "pid": %v}`, p.Id)
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

func (c *Card) GetJsonCardOpen() string {
    return fmt.Sprintf(`{"msg": "cardOpen", "id": %v, "type": %v, "scoredBy": %v}`, c.Id, c.Type, c.ScoredBy)
}

// Could probably be done more elegantly with an array of cards
// and map and join, but whatever, we only ever need up to two.
func getJsonCardClose1(c *Card) string {
    return fmt.Sprintf(`{"msg": "cardsClose", "ids": [%v]}`, c.Id)
}

func getJsonCardClose2(c1 *Card, c2 *Card) string {
    return fmt.Sprintf(`{"msg": "cardsClose", "ids": [%v, %v]}`, c1.Id, c2.Id)
}

func NewGame(cardCount, gameType, maxPlayers, cardType, cardLayout, cardRotation int) *Game {
    g := new(Game)
    g.Players.Init()
    g.Type = gameType
    g.MaxPlayers = maxPlayers
    g.Cards = make(map[int]*Card)
    g.cardCountLeft = cardCount

    g.CardType = cardType

    // the size is padded client size, so the cards are always completely visible (eg +cardDim/2 at sides)
    //TODO: to position the cards, the server would need to know the card size? (or we keep it fix)

    g.registerPlayer = make(chan *Player)
    g.unregisterPlayer = make(chan *Player)
    g.incomingPlayerMessages = make(chan string)

    shuffling_aux := rand.Perm(cardCount)

    //decide on board size depending on cardType, layout, cardCount
    //TODO: check index! Checking indeces is the least one can do !Important
    cardImageSource := utils.GetCardImageSource(cardType)
    padding := 0 //expected spacing between cards

    //TODO: depending on the card layout and card type: choose a board size and distribute cards
    switch cardLayout {
    case CARD_LAYOUT_GRID_TIGHT:
        padding = 10
    case CARD_LAYOUT_GRID_LOOSE: //loose grid and stack share an expected board size?
        fallthrough
    case CARD_LAYOUT_STACK:
        fallthrough
    case CARD_LAYOUT_CHAOTIC:
        fallthrough
    default:
        padding = 20 //TODO: choose values depending on card style
    }

    // place between the grid and the cards
    paddingBorderX := cardImageSource.CardSizeX + padding
    paddingBorderY := cardImageSource.CardSizeX + padding

    // for more fancy card layouts: this could be formulated as a circle packing problem.
    approxRowColCount := math.Sqrt((float64)(cardCount))
    //TODO: misleading naming? NOT number of columns
    cardRowCount := (int)(math.Ceil(approxRowColCount)) //how many cards are in a row
    cardColCount := (int)(math.Floor(approxRowColCount))
    //TODO: may enforce a square board, not rectangular
    g.boardWidth = paddingBorderX*2 + (cardImageSource.CardSizeX+padding)*cardRowCount
    g.boardHeight = paddingBorderY*2 + (cardImageSource.CardSizeY+padding)*cardColCount

    for i := 0; i < cardCount; i++ {
        //TODO: depending on the card rotation: create the desired degree of entropy
        phi := (float64)(0)
        switch cardRotation {
        case CARD_ROTATION_RL: //random multiple of 90
            phi = (float64)(90 * rand.Intn(4))
            fallthrough
        case CARD_ROTATION_JIGGLY: //a little (jiggly)
            // In this case, we allow only for a slight random rotation of the cards: -30..30 degree.
            phi += (float64)(rand.Intn(2*30) - 30)
        case CARD_ROTATION_CHAOS:
            phi = (float64)(rand.Intn(360))
        case CARD_ROTATION_NONE:
        default:
        }

        x := 0.0
        y := 0.0
        switch cardLayout {
        case CARD_LAYOUT_GRID_TIGHT:
            fallthrough
        case CARD_LAYOUT_GRID_LOOSE: //loose grid and stack share an expected board size?
            x = (float64)(cardImageSource.CardSizeX/2 + paddingBorderX + (cardImageSource.CardSizeX+padding)*(i%cardRowCount))
            y = (float64)(cardImageSource.CardSizeY/2 + paddingBorderY + (cardImageSource.CardSizeY+padding)*(i/cardRowCount))
        case CARD_LAYOUT_CHAOTIC:
            x = (float64)(rand.Intn(g.boardWidth - cardImageSource.CardSizeX) + cardImageSource.CardSizeX/2)
            y = (float64)(rand.Intn(g.boardHeight - cardImageSource.CardSizeY) + cardImageSource.CardSizeY/2)
            // Or do we want less random chaos?
            // The first half of the sum places the cards onto a grid.
            // The second half moves each card around randomly within its cell.
            // The factor (0.3) is how "much" the cards should move within their cell.
            //X:        (float64)(i%ncardsx) / (float64)(ncardsx-1) + 0.3*(rand.Float64()-0.5) / (float64)(ncardsx-1),
            //Y:        (float64)(i/ncardsx) / (float64)(ncardsy-1) + 0.3*(rand.Float64()-0.5) / (float64)(ncardsy-1),
        case CARD_LAYOUT_STACK:
            fallthrough
        default:
            x = (float64)(g.boardWidth / 2)
            y = (float64)(g.boardHeight / 2)
        }

        c := Card{
            Id: i,
            X:        x,
            Y:        y,
            Phi:      phi,
            Type:     shuffling_aux[i] / 2,
            IsOpen:   false,
            ScoredBy: NO_PLAYER}

        g.Cards[i] = &c
    }

    // Create the player colors for this game. We ignore the error since if the
    // color palette is nil, a random color is simply drawn for each player.
    g.availColors, _ = colorful.HappyPalette(g.MaxPlayers)

    return g
}

const (
    GAME_TYPE_CLASSIC = iota
    GAME_TYPE_RUSH

    NO_CARD = -1

    CARD_LAYOUT_GRID_TIGHT = 0
    CARD_LAYOUT_GRID_LOOSE = 1
    CARD_LAYOUT_STACK      = 2
    CARD_LAYOUT_CHAOTIC    = 3

    CARD_ROTATION_NONE   = 0
    CARD_ROTATION_JIGGLY = 1
    CARD_ROTATION_RL     = 2
    CARD_ROTATION_CHAOS  = 3
)

//iota is reset between const blocks

type Game struct {
    Players       list.List
    maxPlayerId   int
    Cards         map[int]*Card
    cardCountLeft int       //how many cards are still playable
    Started       time.Time //Used to close zombie games.
    availColors   []colorful.Color

    Type       int //classic or rush - gamemodes
    MaxPlayers int

    CardType    int //what images to display to the players (asset id in cards.json)
    boardWidth  int
    boardHeight int

    registerPlayer         chan *Player
    unregisterPlayer       chan *Player
    incomingPlayerMessages chan string

    //TODO: we could save all events to make game replays possible, for fun
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

// Create and send a "player" message to all players.
// This needs a separate function because the message sent to player "p_to_send"
// is slightly different in that its "itsme" field is "true".
func (g *Game) BroadcastPlayer(p_to_send *Player) {
    for e := g.Players.Front(); e != nil; e = e.Next() {
        p_receiver := e.Value.(*Player)
        p_receiver.send <- p_to_send.GetJsonPlayer(p_to_send == p_receiver)
    }
}

func (g *Game) Run() {
    g.Started = time.Now()
    for {
        select {
        //TODO: obscure cases can be checked here: if the player already disconnected etc
        case p := <-g.registerPlayer:
            if g.Players.Len() >= g.MaxPlayers && g.MaxPlayers > 0 {
                // Sorry, the game is full.
                continue
            }

            //send current board state to player
            p.Id = g.maxPlayerId
            p.Name = fmt.Sprintf("Anon%v", g.Players.Len())
            p.openCard = NO_CARD
            p.Game = g

            // Set the player's color either by taking the first one of this
            // game's palette or creating a random one.
            if g.MaxPlayers > 0 || g.availColors == nil {
                p.Color = g.availColors[0]
                g.availColors = g.availColors[1:]
            } else {
                // TODO: colors might still clash in unlimited games. Shit happens?
                p.Color = colorful.HappyColor()
            }

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
            g.BroadcastPlayer(p)
            g.Players.PushBack(p)
            g.maxPlayerId++

            g.SendInitBoard(p)
            g.SendAllPlayers(p) // Now send him all existing players (including himself)
            g.SendBoardState(p)
        case p := <-g.unregisterPlayer:
            // If he had any open card, close it.
            if p.openCard != NO_CARD {
                g.Cards[p.openCard].IsOpen = false
                g.Broadcast(getJsonCardClose1(g.Cards[p.openCard]))
            }

            // And if this was a turnbased game (classic) and it is his turn, end his turn.
            if p.CanPlay && g.Type == GAME_TYPE_CLASSIC {
                p.SetCanPlay(false, g)
                g.CyclicNextPlayer(p).SetCanPlay(true, g)
            }

            // Tell everybody about the big bad leaver.
            g.Broadcast(p.GetJsonLeave())

            // In classic mode, if it was this player's turn, it's now the next one's turn.
            if g.Type == GAME_TYPE_CLASSIC && p.CanPlay && g.Players.Len() > 1 {
                g.CyclicNextPlayer(p).SetCanPlay(true, g)
            }

            // The leaver's color is available again.
            g.availColors = append(g.availColors, p.Color)

            // Really delete the player's struct.
            for e := g.Players.Front(); e != nil; e = e.Next() {
                if e.Value.(*Player) == p {
                    g.Players.Remove(e)
                    break
                }
            }

            // No more players? Close this game.
            if g.Players.Len() == 0 {
                return
            }
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
        g.Broadcast(g.Cards[cardid].GetJsonCardOpen())
    } else if g.Type == GAME_TYPE_RUSH {
        // In rush mode, only the player opening the card sees it, others don't.
        // This is achieved by sending only that player the card type, but not
        // marking it as opened in general.
        p.send <- g.Cards[cardid].GetJsonCardOpen()
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

    // one more flip
    p.Flips++

    if firstCard.Type != secondCard.Type {
        // Too bad
        p.PreviousWasGood = false

        if g.Type == GAME_TYPE_CLASSIC {
            // close the cards again. (Only in classic)
            firstCard.IsOpen = false
            secondCard.IsOpen = false
            // In the classic mode, we need to close both card for everyone.
            g.Broadcast(getJsonCardClose2(firstCard, secondCard))

            // And then switch to the next player.
            p.SetCanPlay(false, g)
            g.CyclicNextPlayer(p).SetCanPlay(true, g)
        } else if g.Type == GAME_TYPE_RUSH {
            // Note that in rush mode, we always keep the cards closed, unless
            // they are scored. This means no need to "re-close" here since they
            // haven't been opened! Thus the following two lines send the close
            // messages.
            p.send <- getJsonCardClose2(firstCard, secondCard)
        }
        p.Turns++ //and one more played turn at the end of it

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
            g.Broadcast(firstCard.GetJsonCardOpen())
            g.Broadcast(secondCard.GetJsonCardOpen())

            // Check for combo, i.e. successful opening twice.
            if p.PreviousWasGood {
                p.Points++
                g.Broadcast(`{"msg": "combo"}`)

                // Shuffle some random cards around randomly.
                for k, _ := range g.Cards {
                    if rand.Intn(3) == 0 {
                        g.MoveCard(cardPosition{Id: k, X: float64(g.boardWidth) * rand.Float64(), Y: float64(g.boardHeight) * rand.Float64(), Phi: (float64)(rand.Intn(2*360) - 360)})
                    }
                }
            }
        } else {
            //we need to broadcast the card owner anyway
            g.Broadcast(firstCard.GetJsonCardOpen())
            g.Broadcast(secondCard.GetJsonCardOpen())
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
    g.Broadcast(fmt.Sprintf(`{"msg": "turns", "pid": %v, "turns": %v, "flips": %v}`, p.Id, p.Turns, p.Flips))
}

func (g *Game) MoveCard(cardp cardPosition) {
    card := g.Cards[cardp.Id]
    //TODO: is this necessary? trololoyes
    // limit the card position to an area on/around the board -> clamp with padding
    //TODO: g.BoardSizeX-g.CardSizeX should be a derived value...
    card.X = math.Min(math.Max(0.0, cardp.X), (float64)(g.boardWidth))
    card.Y = math.Min(math.Max(0.0, cardp.Y), (float64)(g.boardHeight))
    card.Phi = cardp.Phi
    g.Broadcast(card.GetJsonCardMove())
}

func (g *Game) Chat(pname, msg string) {
    name, _ := json.Marshal(pname)
    jmsg, _ := json.Marshal(msg)
    g.Broadcast(fmt.Sprintf(`{"msg": "chat", "from": %v, "content": %v}`, string(name), string(jmsg)))
}

// sends a board state to a player (ALL the cards)
func (g *Game) SendBoardState(p *Player) {
    for _, card := range g.Cards {
        p.send <- card.GetJsonCardMove()
        if card.IsOpen {
            p.send <- card.GetJsonCardOpen()
        }
    }
}

func (g *Game) SendInitBoard(p *Player) {
    p.send <- fmt.Sprintf(`{"msg": "initBoard", "boardWidth": %v, "boardHeight": %v, "cardCount": %v, "maxPlayers": %v, "cardType": %v}`,
        g.boardWidth, g.boardHeight, len(g.Cards), g.MaxPlayers, g.CardType)
}

func (g *Game) SendAllPlayers(towhom *Player) {
    // Sends "towhom" one newplayer message for every player in the game
    for e := g.Players.Front(); e != nil; e = e.Next() {
        p := e.Value.(*Player)
        towhom.send <- p.GetJsonPlayer(p == towhom)
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
