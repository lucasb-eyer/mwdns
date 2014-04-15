package utils

import (
    "encoding/json"
    "io/ioutil"
    "log"
)

const (
    CARD_CONFIG_FILE = "static/data/cards.json"
)

type CardImageSource struct {
    // there is different metainformation which can be provided for json, see Unmarshal function documentation. Nifty.
    Id        int    `json:"id"`
    Name      string `json:"name"`
    MaxPairs  int    `json:"maxPairs"`
    CardSizeX int    `json:"cardSizeX"`
    CardSizeY int    `json:"cardSizeY"`
    Type      string `json:"type"`
}

type CardInformationStruct struct {
    DeckImages       []string          `json:"deckImages"`
    AssetPrefix      string            `json:"assetPrefix"`
    CardImageSources []CardImageSource `json:"cardImageSources"`
}

var (
    CardInformation CardInformationStruct
)

func ParseCardInformation() {
    b, err := ioutil.ReadFile(CARD_CONFIG_FILE)
    if err != nil {
        log.Fatalln("Failed to open card information file:", err)
    }

    err = json.Unmarshal(b, &CardInformation)
    if err != nil {
        log.Fatalln("Failed to parse card information file:", err)
    }
}

func GetCardImageSource(id int) *CardImageSource {
    if len(CardInformation.CardImageSources) < id {
        id = 0
        log.Println("ImageSource Id issue: too big ", id)
    }

    //TODO: we could have a dictionary of {id: definition} in the json data file instead of a list
    cardImageSource := &CardInformation.CardImageSources[id]
    // check if array position is equal to the id of the card type
    if cardImageSource.Id != id {
        log.Println("ImageSource Id issue: wrong asset order, id != Id ", id)
    }

    return cardImageSource
}
