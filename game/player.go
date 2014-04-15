package game

import (
    "github.com/lucasb-eyer/go-colorful"
    "code.google.com/p/go.net/websocket"
    "io"
    "log"
    "bytes"
    "encoding/json"
    "strconv"
    "fmt"
    "strings"
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

func (p *Player) SetCanPlay(v bool, g *Game) {
    p.CanPlay = v
    //notify the respective player with a message and everybody else too
    g.Broadcast(p.GetJsonCanPlay())
}

func (p *Player) GetJsonCanPlay() string {
    return fmt.Sprintf(`{"msg": "canplay", "pid": %v, "canplay": %v}`, p.Id, p.CanPlay)
}

func (p *Player) GetJsonPlayer(itshim bool) string {
    name, _ := json.Marshal(p.Name)
    return fmt.Sprintf(`{"msg": "player", "pid": %v, "canplay": %v, "itsyou": %v, "name": %v, "color": "%v", "points": %v, "flips": %v, "turns": %v}`, p.Id, p.CanPlay, itshim, string(name), p.Color.Hex(), p.Points, p.Flips, p.Turns)
}

func (p *Player) GetJsonLeave() string {
    return fmt.Sprintf(`{"msg": "leaver", "pid": %v}`, p.Id)
}
