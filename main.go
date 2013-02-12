package main

import (
	"code.google.com/p/go.net/websocket"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"text/template"
	"time"
	"net/url"
)

var addr = flag.String("addr", ":8080", "http service address")
var homeTempl = template.Must(template.ParseFiles("templates/startView.html"))
var gameTempl = template.Must(template.ParseFiles("templates/gameView.html"))
var activeGames = make(map[string]*Game)

const (
	IDCHARS            = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	IDLEN              = 6
	DEFAULT_PAIR_COUNT = 10
	DEFAULT_GAME_TYPE  = GAME_TYPE_CLASSIC
	DEFAULT_MAX_PLAYERS= 5

	DEFAULT_W = 1300 - 150 // minus card w because pos is top left
	DEFAULT_H = 800 - 220  // idem
)

func homeHandler(c http.ResponseWriter, req *http.Request) {
	homeTempl.Execute(c, req.Host)
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
			log.Println("Invalid number of pairs, defaulting to ", DEFAULT_PAIR_COUNT)
			nCards = DEFAULT_PAIR_COUNT
		}
		nCards *= 2

		gameType, err := strconv.Atoi(req.URL.Query().Get("t"))
		if err != nil || (gameType != GAME_TYPE_CLASSIC && gameType != GAME_TYPE_RUSH) {
			log.Println("Invalid game type, defaulting to ", DEFAULT_GAME_TYPE)
			gameType = DEFAULT_GAME_TYPE
		}

		maxPlayers, err := strconv.Atoi(req.URL.Query().Get("m"))
		if err != nil {
			log.Println("Invalid max player count, defaulting to ", DEFAULT_MAX_PLAYERS)
			maxPlayers = DEFAULT_MAX_PLAYERS
		}

		gameId = rndString(IDLEN)
		g := NewGame(nCards, gameType, maxPlayers)
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
			http.Redirect(w, req, "/?errmsg=" + url.QueryEscape(errmsg), 303)
			return
		}
		gameTempl.Execute(w, req.Host)
	}
}

func wsHandler(ws *websocket.Conn) {
	// Get the game we're talking about, if it exists.
	gameId := ws.Request().URL.Query().Get("g")
	game, ok := activeGames[gameId]
	if !ok {
		log.Println("Websocket request with invalid gameId: ", gameId)
		websocket.Message.Send(ws, `{"msg": "err_gameid", "gid": "` + gameId + `"}`)
		return
	}

	// Check if the game can take any more players.
	if game.Players.Len() >= game.MaxPlayers {
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

func main() {
	rand.Seed(time.Now().UTC().UnixNano())

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
