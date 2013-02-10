Scoreboard = function(selector) {
	this.node = $(selector)
	this.pid_rows = {}
}

Scoreboard.prototype.addPlayer = function(pid, name, color, score) {
	// TODO: This should probably be in some template file somewhere else.
	this.node.find('table').append('<tr id=player' + pid + '><td class=name><div class=col></div>' + name + '</td><td class=points>' + score + '</td></tr>')
	this.pid_rows[pid] = this.node.find('#player' + pid)
}

Scoreboard.prototype.updateName = function(pid, name) {
	this.pid_rows[pid].find('.name span').text(name)
}

Scoreboard.prototype.updateColor = function(pid, color) {
	this.pid_rows[pid].find('.col').css('background-color', color)
}

Scoreboard.prototype.updateScore = function(pid, score, delta) {
	// TODO: keep the scoreboard sorted?
	this.pid_rows[pid].find('.points').text(score)

	// TODO: Show a special effect using the delta, if given
}

Scoreboard.prototype.updateCanPlay = function(pid, canplay) {
	//TODO: something. (grey/black name maybe?)
}

Scoreboard.prototype.leaver = function(pid) {
	//TODO: something. (grey out and change score to red LEAVER?)
}
