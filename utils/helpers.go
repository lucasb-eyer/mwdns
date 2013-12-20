package utils

import (
    "math/rand"
    "strings"
)

const (
    // pool from which game ids are constructed, some easy-to-confuse symbols are not included ("I1l" for example)
    IDCHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ023456789"
)

func RndString(length int) string {
    a := make([]string, length)
    for i := 0; i < length; i++ {
        a[i] = (string)(IDCHARS[rand.Intn(len(IDCHARS))])
    }

    return strings.Join(a, "")
}
