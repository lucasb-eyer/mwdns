Player = function(pid, name, color, canplay) {
    this.pid = pid
    this.name = name
    this.color = color
    this.canplay = canplay || false
    this.points = 0
    this.turns = 0

    // Add myself to the scoreboard.
    g_scoreboard.addPlayer(this.pid, this.name, this.color, this.turns, this.points, this.canplay)
}

Player.prototype.changeCanPlay = function(canplay) {
    g_scoreboard.updateCanPlay(this.pid, canplay)
    this.canplay = canplay
}

Player.prototype.updatePoints = function(newpoints) {
    g_scoreboard.updateScore(this.pid, newpoints, newpoints - this.points)
    this.points = newpoints
}

Player.prototype.updateTurns = function(newturns) {
    g_scoreboard.updateTurns(this.pid, newturns)
    this.turns = newturns
}

Player.prototype.changeName = function(newname) {
    g_scoreboard.updateName(this.pid, newname)
    this.name = newname
}

Player.prototype.changeColor = function(newcol) {
    g_scoreboard.updateColor(this.pid, newcol)
    this.color = newcol
}
