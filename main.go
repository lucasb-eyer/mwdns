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

func gameHandler(w http.ResponseWriter, req *http.Request) {
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

		gameId = rndString(IDLEN)
		g := NewGame(nCards, gameType)
		activeGames[gameId] = g
		log.Println("New game of type ", gameType, " with ", nCards, " cards created: ", gameId)
		go g.Run()

		http.Redirect(w, req, fmt.Sprintf("/game?g=%v", gameId), 303)
	} else {
		//game already exists.
		//TODO: why is this printed so often? (31 times...)
		log.Println("Game", gameId, "requested")

		//redirect to the start page if the game does not exist
		_, ok := activeGames[gameId]
		if !ok {
			log.Println("Game not found: ", gameId)
			http.Redirect(w, req, "/", 303) //silent reditect to home screen, TODO: show message that game does not exist
			return
		}
		gameTempl.Execute(w, req.Host)
	}
}

func wsHandler(ws *websocket.Conn) {
	gameId := ws.Request().URL.Query().Get("g")
	if gameId == "" {
		//TODO: proper error handling
		log.Println("Websocket request without valid gameId: ", gameId)
		return
	}

	game, ok := activeGames[gameId]
	if !ok {
		log.Println("Game not found (for websocket request): ", ws)
		return
	}

	//TODO: check if game is running, can take any more players etc

	// create player for the game
	player := &Player{
		CanPlay: false,
		Points:  0,

		// create socket connection
		send: make(chan string, 256),
		ws:   ws}

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
