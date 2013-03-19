package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var addr = flag.String("addr", ":8080", "http service address")
var homeTempl = CreateAutoTemplate("templates/startView.html")
var gameTempl = CreateAutoTemplate("templates/gameView.html")
var activeGames = make(map[string]*Game)

const (
	IDCHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ023456789"
	IDLEN   = 6

	DEFAULT_PAIR_COUNT  = 10
	DEFAULT_GAME_TYPE   = GAME_TYPE_CLASSIC
	DEFAULT_MAX_PLAYERS = 0

	CARD_CONFIG_FILE = "static/data/cards.json"
)

func homeHandler(c http.ResponseWriter, req *http.Request) {
	homeTempl.Execute(c, cardInformation) //req.Host?
}

func rndString(length int) string {
	a := make([]string, length)
	for i := 0; i < length; i++ {
		a[i] = (string)(IDCHARS[rand.Intn(len(IDCHARS))])
	}

	return strings.Join(a, "")
}

func cleanGames() {
	// Goes over the list of active games and removes those which are over.
	// TODO: highscore? history?
	for gid, g := range activeGames {
		// Gotta leave the first player some time to join tho!
		if g.Players.Len() == 0 && time.Since(g.Started).Seconds() > 10 {
			log.Println("Removing empty game ", gid)
			delete(activeGames, gid)
		}
	}
}

// TODO: pray that this is not called in multiple threads! It's not safe at all.
func gameHandler(w http.ResponseWriter, req *http.Request) {
	// This is the "reaper" form of cleanup: cleanup every now and then
	// (i.e. whenever there is a request to /game).
	cleanGames()

	gameId := req.URL.Query().Get("g")
	if gameId == "" || len(gameId) != 6 {
		// create a new game if no gameid is given
		nCards, err := strconv.Atoi(req.URL.Query().Get("n"))
		if err != nil {
			log.Println("Invalid number of pairs", req.URL.Query().Get("n"), ", defaulting to ", DEFAULT_PAIR_COUNT)
			nCards = DEFAULT_PAIR_COUNT
		}
		nCards *= 2

		gameType, err := strconv.Atoi(req.URL.Query().Get("t"))
		if err != nil || (gameType != GAME_TYPE_CLASSIC && gameType != GAME_TYPE_RUSH) {
			log.Println("Invalid game type", req.URL.Query().Get("t"), ", defaulting to ", DEFAULT_GAME_TYPE)
			gameType = DEFAULT_GAME_TYPE
		}

		maxPlayers, err := strconv.Atoi(req.URL.Query().Get("m"))
		if err != nil {
			if req.URL.Query().Get("m") == "∞" {
				maxPlayers = 0
			} else {
				log.Println("Invalid max player count", req.URL.Query().Get("m"), ", defaulting to ", DEFAULT_MAX_PLAYERS)
				maxPlayers = DEFAULT_MAX_PLAYERS
			}
		}

		//TODO: handle other elements
		//ct (id from json - the card sizes are important)
		//cl (tight grid = 0/loose grid/stack)
		//cr (no rotations = 0/some/lots)

		cardType, err := strconv.Atoi(req.URL.Query().Get("ct"))
		if err != nil {
			log.Println("Invalid card type parameter, defaulting to ", 0)
			cardType = 0
		}

		cardLayout, err := strconv.Atoi(req.URL.Query().Get("cl"))
		if err != nil {
			log.Println("Invalid card layout parameter, defaulting to ", 0)
			cardLayout = 0
		}

		cardRotation, err := strconv.Atoi(req.URL.Query().Get("cr"))
		if err != nil {
			log.Println("Invalid card rotation parameter, defaulting to ", 0)
			cardRotation = 0
		}

		gameId = rndString(IDLEN)
		g := NewGame(nCards, gameType, maxPlayers, cardType, cardLayout, cardRotation)
		activeGames[gameId] = g
		log.Println("New game of type ", gameType, " with ", nCards, " cards and at most ", maxPlayers, " players created: ", gameId)
		go g.Run()

		http.Redirect(w, req, fmt.Sprintf("/game?g=%v", gameId), 303)
	} else {
		//game already exists.
		log.Println("Game", gameId, "requested")

		//redirect to the start page if the game does not exist
		_, ok := activeGames[gameId]
		if !ok {
			log.Println("Game not found: ", gameId)
			errmsg := "The game you were trying to join (id: <b>" + gameId + "</b>) doesn't exist!"
			http.Redirect(w, req, "/?errmsg="+url.QueryEscape(errmsg), 303)
			return
		}
		gameTempl.Execute(w, nil)
	}
}

func wsHandler(ws *websocket.Conn) {
	// Get the game we're talking about, if it exists.
	gameId := ws.Request().URL.Query().Get("g")
	game, ok := activeGames[gameId]
	if !ok {
		log.Println("Websocket request with invalid gameId: ", gameId)
		websocket.Message.Send(ws, `{"msg": "err_gameid", "gid": "`+gameId+`"}`)
		return
	}

	// Check if the game can take any more players.
	if game.Players.Len() >= game.MaxPlayers && game.MaxPlayers > 0 {
		log.Println("Game is already full")
		websocket.Message.Send(ws, fmt.Sprintf(`{"msg": "err_gamefull", "gid": "%v", "max": %v}`, gameId, game.MaxPlayers))
		return
	}

	// create player for the game
	player := &Player{
		CanPlay: false,
		Points:  0,

		// create socket connection
		send: make(chan string, 256),
		ws:   ws,
	}

	game.AddPlayer(player)
	defer func() { game.RemovePlayer(player) }()

	go player.writer()
	player.reader()
}

type CardInformation struct {
	DeckImages       []string          `json:"deckImages"`
	AssetPrefix      string            `json:"assetPrefix"`
	CardImageSources []CardImageSource `json:"cardImageSources"`
}

type CardImageSource struct {
	// there is different metainformation which can be provided for json, see Unmarshal function documentation. Nifty.
	Id        int    `json:"id"`
	Name      string `json:"name"`
	Size      int    `json:"size"`
	MaxPairs  int    `json:"maxPairs"`
	CardSizeX int    `json:"cardSizeX"`
	CardSizeY int    `json:"cardSizeY"`
}

func GetCardImageSource(id int) *CardImageSource {
	if len(cardInformation.CardImageSources) < id {
		id = 0
		log.Println("ImageSource Id issue: too big ", id)
	}
	cardImageSource := &cardInformation.CardImageSources[id]
	if cardImageSource.Id != id {
		log.Println("ImageSource Id issue: wrong asset order, id != Id ", id)
	}

	return cardImageSource
}

var cardInformation CardInformation

func parseCardInformation() {
	b, err := ioutil.ReadFile(CARD_CONFIG_FILE)
	if err != nil {
		log.Fatalln("Failed to open card information file:", err)
	}

	err = json.Unmarshal(b, &cardInformation)
	if err != nil {
		log.Fatalln("Failed to parse card information file:", err)
	}

	// debug for json parsing. Spoiler: it currently works as expected
	/*
		log.Println("List of parsed card theme names:")
		for _,r := range(cardInformation.CardImageSources) {
			log.Println(r.Name)
		}
	*/
}

func main() {
	rand.Seed(time.Now().UTC().UnixNano())
	log.Println("Parsing card information from json file")
	parseCardInformation()

	sm := http.NewServeMux()
	sm.HandleFunc("/", homeHandler)
	sm.HandleFunc("/game", gameHandler)
	sm.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	sm.Handle("/ws", websocket.Handler(wsHandler))

	log.Println("Starting Server on ", *addr)
	s := http.Server{Handler: sm, Addr: *addr}
	if err := s.ListenAndServe(); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
