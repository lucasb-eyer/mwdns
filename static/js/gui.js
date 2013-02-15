Scoreboard = function(selector) {
	this.node = $(selector)
	this.pid_rows = {}
}

Scoreboard.prototype.addPlayer = function(pid, name, color, turns, points, canplay) {
	// TODO: This should probably be in some template file somewhere else.
	template = "<tr id=player" + pid + ">"
	         + "  <td class=name>"
	         + "    <div class=color></div><span>" + name + "</span>"
	         + "  </td>"
	         + "  <td class=turns>" + turns + "</td>" //TODO
	         + "  <td class=points>" + points + "</td>"
	         + "</tr>";
	this.node.find('table').append(template)
	this.pid_rows[pid] = this.node.find('#player' + pid)

	this.updateName(pid, name)
	this.updateColor(pid, color)
	this.updateCanPlay(pid, canplay)
}

Scoreboard.prototype.updateName = function(pid, name) {
	// Little indicater for idi.. newbies.
	if(pid == g_mypid) {
		name += " (you)"
	}

	// Here jQuery's 'text' does the escaping of < and friends for us.
	this.pid_rows[pid].find('.name span').text(name)
}

Scoreboard.prototype.updateColor = function(pid, color) {
	this.pid_rows[pid].find('.color').css('background-color', color)
}

Scoreboard.prototype.updateScore = function(pid, points, delta) {
	// TODO: keep the scoreboard sorted?
	this.pid_rows[pid].find('.points').text(points)

	// TODO: Show a special effect using the delta, if given
}

Scoreboard.prototype.updateCanPlay = function(pid, canplay) {
	// You can play: black name. You can't play: grey name.
	this.pid_rows[pid].find('.name span').css('color', canplay ? 'black' : 'grey')
}

Scoreboard.prototype.updateTurns = function(pid, turns) {
	this.pid_rows[pid].find('.turns').text(turns)
}

Scoreboard.prototype.showInvite = function(showInvite) {
	if (showInvite) {
		$("#gameLink").text(document.URL)
		$("#helpfulSuggestionBox").show();
	} else {
		$("#helpfulSuggestionBox").hide();
	}
}

Scoreboard.prototype.leaver = function(pid) {
	// Leaver gets greyed- and striked- out name...
	this.pid_rows[pid].find('.name span').css({
		'color': 'grey',
		'text-decoration': 'line-through'
	})
	// ...and of course no points!
	this.pid_rows[pid].find('.points').text('LEFT') //TODO: rather add LEFT so the score is still visible?
	this.pid_rows[pid].find('.points').css('color', 'red')
}
