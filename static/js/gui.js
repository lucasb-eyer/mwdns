resizeGui = function() {
	// All controls are fine, except for the chat messages, which we want
	// to take all the size which is left.
	// No, this is _not_ possible in CSS, it's not the typical "footer" thing
	// since we don't know the height of the scoreboard statically.
	guih = $('#playerGui').height()
	msgh = $('#helpfulSuggestionBox').outerHeight(true)
	scoreboardh = $('#scoreboard').outerHeight(true)
	sendbuttonh = $('#chatControl').outerHeight(true)
	chatmsg_margin = $('#chatMessages').outerHeight(true) - $('#chatMessages').innerHeight()
	$('#chatMessages').height(guih - msgh - scoreboardh - sendbuttonh - chatmsg_margin)
	console.log("resize: " + guih + "-" + msgh + "-" + scoreboardh + "-" + sendbuttonh + "-" + chatmsg_margin + " = " + $('#chatMessages').height())
}

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
	this.node.find('tbody').append(template)
	this.pid_rows[pid] = this.node.find('#player' + pid)

	this.updateName(pid, name)
	this.updateColor(pid, color)
	this.updateCanPlay(pid, canplay)
	resizeGui()
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
	resizeGui()
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

