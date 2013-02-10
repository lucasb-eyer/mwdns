package main

import(
	"math/rand"
	"strconv"
)

func absint(v int) int {
	if v >= 0 {
		return v
	}
	return -v
}

//HSV to RGB! SCIENCE! thx wikipedia
func Hsv2Rgb(H int, S, V float64) (int, int, int) {
	Hp := H/60.0
	C := V*S
	X := C * float64(1-absint(Hp%2-1))

	m := V-C;
	r, g, b := 0.0, 0.0, 0.0

	switch {
	case 0 <= Hp && Hp < 1:
		r = C;
		g = X;
	case 1 <= Hp && Hp < 2:
		r = X;
		g = C;
	case 2 <= Hp && Hp < 3:
		g = C;
		b = X;
	case 3 <= Hp && Hp < 4:
		g = X;
		b = C;
	case 4 <= Hp && Hp < 5:
		r = X;
		b = C;
	case 5 <= Hp && Hp < 6:
		r = C;
		b = X;
	}

	return int((m+r)*15.0), int((m+g)*15.0), int((m+b)*15.0)
}

func Rgb2Hex(r, g, b int) (string) {
	rs := strconv.FormatInt(int64(r), 16)
	gs := strconv.FormatInt(int64(g), 16)
	bs := strconv.FormatInt(int64(b), 16)
	return "#" + rs + gs + bs
}

func HappyColor() (int, int, int) {
	H := int(rand.Float64() * 360.0)
	S := 0.8+rand.Float64()*0.2
	V := 0.6+rand.Float64()*0.3

	return Hsv2Rgb(H,S,V)
}

