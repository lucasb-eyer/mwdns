package game

import (
    "sync"
    "log"
    "time"
    "errors"

    "github.com/lucasb-eyer/mwdns/utils"
)

const (
    // length of game id
    IDLEN               = 6
)

type GameManager struct {
    activeGames map[string]*Game
    gameMutex sync.Mutex //to manage access to the ActiveGames map
}

func NewGameManager() *GameManager {
    gm := &GameManager{}
    gm.activeGames = make(map[string]*Game)
    return gm
}

func (gm *GameManager) CreateNewGame(nCards, gameType, maxPlayers, cardType, cardLayout, cardRotation int) (gameId string) {
    //TODO: there we want to create a game, but do not really care for the exact id
    //  this might be solved by one single go process, listening for channel requests for new games/for them to be deleted
    gameId = utils.RndString(IDLEN) //TODO: check for collision
    g := NewGame(nCards, gameType, maxPlayers, cardType, cardLayout, cardRotation)

    gm.gameMutex.Lock()
    defer gm.gameMutex.Unlock() //this is holding the mutex longer than needed
    gm.activeGames[gameId] = g

    log.Println("New game of type", gameType, "with", nCards, "cards and at most", maxPlayers, "players created: ", gameId)
    log.Println("The above game's card type is", cardType, "the card layout is", cardLayout, "and their rotation is", cardRotation)
    go g.Run()

    return
}

func (gm *GameManager) GetGame(gameId string) (*Game, error) {
    gameInstance, ok := gm.activeGames[gameId]

    if !ok {
        return nil, errors.New("Game with this id was not found")
    }
    return gameInstance, nil
}

//TODO: may not clean them right away?
func (gm *GameManager) CleanGames() {
    // Goes over the list of active games and removes those which are over.
    // TODO: highscore? history?

    gm.gameMutex.Lock()
    defer gm.gameMutex.Unlock()
    for gid, g := range gm.activeGames {
        // Gotta leave the first player some time to join tho!
        if g.Players.Len() == 0 && time.Since(g.Started).Seconds() > 10 {
            log.Println("Removing empty game ", gid)
            delete(gm.activeGames, gid)
        }
    }
}

