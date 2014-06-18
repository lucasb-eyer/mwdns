package game

import (
    "fmt"
)

type cardPosition struct {
    Id  int
    X   float64
    Y   float64
    Phi float64 //rotation
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
func GetJsonCardClose1(c *Card) string {
    return fmt.Sprintf(`{"msg": "cardsClose", "ids": [%v]}`, c.Id)
}

func GetJsonCardClose2(c1 *Card, c2 *Card) string {
    return fmt.Sprintf(`{"msg": "cardsClose", "ids": [%v, %v]}`, c1.Id, c2.Id)
}

