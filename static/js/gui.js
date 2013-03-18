resizeGui = function() {
	// All controls are fine, except for the chat messages, which we want
	// to take all the size which is left.
	// No, this is _not_ possible in CSS, it's not the typical "footer" thing
	// since we don't know the height of the scoreboard statically.
	var guih = $('#playerGui').height()

	// Strangely, the height is sometimes _not_ 0 even when the element is hidden.
	// This is clearly a bug in jQuery, which I cannot reproduce in a fiddle.
	var outerHeightOrZero = function($obj) { return $obj.is(":visible") ? $obj.outerHeight(true) : 0; }
	var innerHeightOrZero = function($obj) { return $obj.is(":visible") ? $obj.innerHeight() : 0; }
	var msgh = outerHeightOrZero($('#helpfulSuggestionBox'))
	var scoreboardh = outerHeightOrZero($('#scoreboard'))
	var sendbuttonh = outerHeightOrZero($('#chatControl'))
	var chatmsg_margin = outerHeightOrZero($('#chatMessages')) - innerHeightOrZero($('#chatMessages'))

	$('#chatMessages').height(guih - msgh - scoreboardh - sendbuttonh - chatmsg_margin)
}

Scoreboard = function(selector) {
	this.node = $(selector)
	this.pid_rows = {}
}

Scoreboard.prototype.addPlayer = function(pid, name, color, turns, points, canplay) {
	// TODO: This should probably be in some template file somewhere else.
	var template = "<tr id=player" + pid + ">"
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

	// show a helpful suggestion if we're not full yet.
	// +1 because the new player is not in the g_players array yet.
	// != instead of <= so that we catch maxPlayers == 0 too.
	this.showInvite(g_players.length+1 != gameBoard.maxPlayers)
	resizeGui()
}

Scoreboard.prototype.updateName = function(pid, name) {
	// Here jQuery's 'text' does the escaping of < and friends for us.
	namespan = this.pid_rows[pid].find('.name span')
	namespan.text(name)

	// Little indicater for idi.. newbies.
	if(pid == g_mypid) {
		namespan.append(" (<a href id=change_name_link>you</a>)")
		$('#change_name_link').on('click', function(e) {
			newname = prompt('Change your name:', name)
			if(newname) {
				sendMessage('{"wantChangeName": '+JSON.stringify(newname)+'}')
			}
			return false
		})
	}
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
		$("#gameLinkCopyButton").attr("data-clipboard-text",document.URL) //for ZeroClipboard
		var clip = new ZeroClipboard( document.getElementById("gameLinkCopyButton"), {
			moviePath: "/static/ZeroClipboard.swf"
		});

		// SEE: https://github.com/jonrohan/ZeroClipboard
		clip.on( 'complete', function(client, args) {
			//alternative: $(this)
			$("#gameLinkCopyButton").text("Done")
			window.setTimeout(function() {$("#gameLinkCopyButton").text("Copy")},1000) //show the copy text again after a second

			//the line below hides the button
			//this.style.display = 'none'; // "this" is the element that was clicked
			//alert("Copied text to clipboard: " + args.text );
		} );

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

	// If we are less than the maximum of players, show the invite again.
	// -1 because the player is not removed from the array yet.
	// != instead of <= so that we catch maxPlayers==0 too.
	this.showInvite(g_players.length-1 != gameBoard.maxPlayers)
}

Chat = function(msglist_selector, form_selector) {
	this.msglist = $(msglist_selector)
	this.msglist.empty()

	this.form = $(form_selector)
	this.form.on('submit', function(ev) {
		// Get what is written in the textfield.
		var input = $(ev.target).find("[name=what]")

		// Send and don't forget to clear it for a "sent" effect, even though we don't know.
		sendMessage('{"chat": '+JSON.stringify(input.val())+'}') //TODO: why not JSON.stringify, like with the wantChangeName message?
		input.val('')
		return false
	})
}

Chat.prototype.message = function(from, text) {
	// Show the message using the player's name and color we know locally.
	var name = g_players.hasOwnProperty(from) ? g_players[from].name : "???"
	var color = g_players.hasOwnProperty(from) ? g_players[from].color : "black";
	var html = $('<li><span class="messageWho" style="color:' + color + ';">' + name + ': </span>' +
	                 '<span class="messageWhat">' + text + '</span>') // No need for </li>
	this.msglist.append(html)
}
