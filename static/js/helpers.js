rnd = Math.random;
function sgn() {
  if (randomRange(0,1) == 0) {
    return 1;
  } else {
    return -1;
  }
}

function dist(p1, p2) {
  var dx = p1[0]-p2[0],
      dy = p1[1]-p2[1];
  return Math.sqrt(dx*dx+dy*dy);
}

function angle_between(p1, p2) {
  var dx = p1[0]-p2[0],
      dy = p1[1]-p2[1];
  return Math.atan2(dy, dx) * 57.2957795
}

function randomRange(min, max)  {
  var range = (max-min) + 1;
  var rand = Math.floor( (Math.random()*range)%range );
  return min+rand;
}

function randomGrayscale() {
  var s = "#";
  var a = randomRange(0,15).toString(16);
  for (var i = 0; i < 6; i++) {
    s+= a;
  }
  return s;
}

function randomColor() {
  var s = "#";
  for (var i = 0; i < 6; i++) {
    s+= randomRange(0,15).toString(16);
  }
  return s;
}

function randomBrightColor() {
  var s = "#";
  for (var i = 0; i < 3; i++) {
    s+= randomRange(0,15).toString(16);
  }
  return s;
}

//HSV to RGB! SCIENCE! thx wikipedia
function randomHappyColor() {
  H = Math.random() * 360;

  S = 0.8+Math.random()*0.2;
  V = 0.6+Math.random()*0.3;

  C = V*S;
  Hp = H/60;
  X = C*(1-Math.abs((Hp%2)-1));

  m = V-C;

  rgb = [0,0,0]

  if (0 <= Hp && Hp < 1) {
    rgb[0] = C;
    rgb[1] = X;
  } else if (1 <= Hp && Hp < 2) {
    rgb[0] = X;
    rgb[1] = C;
  } else if (2 <= Hp && Hp < 3) {
    rgb[1] = C;
    rgb[2] = X;
  } else if (3 <= Hp && Hp < 4) {
    rgb[1] = X;
    rgb[2] = C;
  } else if (4 <= Hp && Hp < 5) {
    rgb[0] = X;
    rgb[2] = C;
  } else if (5 <= Hp && Hp < 6) {
    rgb[0] = C;
    rgb[2] = X;
  }

  var s = "#";
  for (var i = 0; i < 3; i++) {
    s+= Math.round((rgb[i]+m)*15).toString(16);
  }

  return s;
}
