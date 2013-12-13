rnd = Math.random
function sgn() {
    if (randomRange(0,1) == 0) {
        return 1
    } else {
        return -1
    }
}

function dist(p1, p2) {
    var dx = p1[0]-p2[0],
        dy = p1[1]-p2[1]
    return Math.sqrt(dx*dx+dy*dy)
}

function angle_between(p1, p2) {
    var dx = p1[0]-p2[0],
        dy = p1[1]-p2[1]
    return Math.atan2(dy, dx) * 57.2957795
}

function randomRange(min, max)  {
    var range = (max-min) + 1
    var rand = Math.floor( (Math.random()*range)%range )
    return min+rand
}

function randomGrayscale() {
    var s = "#"
    var a = randomRange(0,15).toString(16)
    for (var i = 0; i < 6; i++) {
        s+= a
    }
    return s
}

function randomColor() {
    var s = "#"
    for (var i = 0; i < 6; i++) {
        s+= randomRange(0,15).toString(16)
    }
    return s
}

function randomBrightColor() {
    var s = "#"
    for (var i = 0; i < 3; i++) {
        s+= randomRange(0,15).toString(16)
    }
    return s
}

function randomHappyColor() {
    var H = Math.random() * 360
    var S = 0.8+Math.random()*0.2
    var V = 0.6+Math.random()*0.3

    return convertHSVtoRGB(H,S,V)
}

// delivers an array of rgb strings, equivalent to colors from all 360° of the [H]SV spectrum
function randomDistinctiveHappyColors(count) {
    results = []
        for (var i = 0; i < count; i++) {
            var H = i*360.0/count
            var S = 0.8+Math.random()*0.2
            var V = 0.6+Math.random()*0.3

            results.push(convertHSVtoRGB(H,S,V))
        }
    return results
}

//HSV to RGB! SCIENCE! thx wikipedia
// returns a string representation for convenience
function convertHSVtoRGB(H,S,V) {
    var C = V*S
    var Hp = H/60
    var X = C*(1-Math.abs((Hp%2)-1))

    var m = V-C

    var rgb = [0,0,0]

        if (0 <= Hp && Hp < 1) {
            rgb[0] = C
            rgb[1] = X
        } else if (1 <= Hp && Hp < 2) {
            rgb[0] = X
            rgb[1] = C
        } else if (2 <= Hp && Hp < 3) {
            rgb[1] = C
            rgb[2] = X
        } else if (3 <= Hp && Hp < 4) {
            rgb[1] = X
            rgb[2] = C
        } else if (4 <= Hp && Hp < 5) {
            rgb[0] = X
            rgb[2] = C
        } else if (5 <= Hp && Hp < 6) {
            rgb[0] = C
            rgb[2] = X
        }

    var s = "#"
    for (var i = 0; i < 3; i++) {
        s+= Math.round((rgb[i]+m)*15).toString(16)
    }

    return s
}

var transformKeys = ["-moz-transform", "-webkit-transform", "-o-transform", "transform"]
var transformOriginKeys = ["-moz-transform-origin", "-webkit-transform-origin", "-o-transform-origin", "transform-origin"]
function setScale(jqueryNode, scale) {
    for (var i in transformKeys) {
        jqueryNode.css(transformKeys[i],"scale("+scale+","+scale+")")
            jqueryNode.css(transformOriginKeys[i],"top left")
    }
}

//TODO: applying the scale and rotation functions to the same element, will certainly lead to strange effects - mind the different origins
//the game board is scaled -> when needed this is the part to be changed
function setRotation(jqueryNode, deg) {
    for (var i in transformKeys) {
        jqueryNode.css(transformKeys[i],"rotate("+deg+"deg)")
            jqueryNode.css(transformOriginKeys[i],"center")
    }
}
