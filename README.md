A custom script to operate a queue in Firebot.

Operates on a user-specified JSON file that Firebot can read and write.
Two upcoming Firebot features will affect this project:
- The ability to manage custom variables inside a custom script. This will relieve the need for local files.
- A queue management system. This will likely deprecate the project entirely.

# Short-comings
- Currently v5, unknown if it will work on v6.
- You need to enable Custom Script Effect in Firebot advanced settings.
- Firebot complains that it may not be for v5, I do not know what's missing. I've followed the documentation on the wiki. It works fine though.
- Any command parameter that can be a user is not validated to be an actual user in chat. This is not a real problem as currently the only way to get into the queue is if a user joins themself, and all user parameters affect users already in the queues.
- Any command parameter that can be a user or a number will prefer a number, thus making a username that's all numbers impossible to access.

# Setup
- Download `queue.js`, and put it in the Firebot scripts folder.
	- On Windows this is `%APPDATA%\Firebot\v5\profiles\Main Profile\scripts`.
	- There is a "scripts folder" link in the Run Custom Script dialogue view in the Firebot trigger setup, to help find it.
- Create an empty text file for the queue.
	- It's standard to give it a `.json` extension, not `.txt`, but this doesn't really matter.
	- It makes sense for it to live with `queue.js`, but again, this doesn't matter.
- Add triggers for the following 4 main commands, and have them run `queue.js`.
	- Trigger conditions for the arguments are not necessary, the script does this.

# Commands
- These _are_ hard-coded for the time being.
- `!join`
	- The sender is added to the end of the main queue, and the bot says in chat: `TwitchUser added to the queue at position 3`.
	- If the sender is already in the main queue, or the skipped priority queue, they are **not** added twice, and the bot says in chat: `TwitchUser is already in the queue at position 3`.
- `!leave`
	- The sender is removed from the skipped priority queue or the main queue, and the bot says in chat: `TwitchUser is no longer in the queue`.
	- If the sender is not in either queue, the bot says in chat: `TwitchUser wasn't in the queue`.
- `!rejoin`
	- The sender is removed from the skipped priority queue or the main queue, and put on the end of the main queue.
	- If the sender is not in either queue, they're still added.
	- The bot always says in chat: `TwitchUser is now at the end of the queue at position 3`.
- `!skip`
	- The sender is removed from the next-up queue, added to the end of the skipped priority queue, one user is shifted from the main queue to the next-up queue to replace them, and the bot says in chat: `Skipping TwitchUser` followed by the normal `!queue shift 1` response.
	- If the sender is not in the next-up queue, the bot says in chat: `TwitchUser wasn't up next`.
- `!queue`
	- This command takes arguments.
	- `list` - Usage: `!queue list`
		- Lists the users in the main queue. The bot says in chat: `3 users in the queue: hamstap85, NotJeffBezos, TwitchUser`.
	- `next` - Usage: `!queue next 3`
		- If this is a number, that many users are grabbed first from the front of the skipped priority queue, then from the front of the main queue if necessary, the next-up queue **becomes** them, and the bot says in chat: `Next 3 in queue: hamstap85, NotJeffBezos, TwitchUser`.
	- `remove` - Usage: `!queue remove NotJeffBezos`
		- The given user is removed from the main queue, and the bot says in chat: `NotJeffBezos is no longer in the queue`.
		- If the given user is not in the main queue, the bot says in chat: `NotJeffBezos wasn't in the queue`.
	- `replace` - Usage: `!queue replace NotHereAnymore`
		- The given user is removed from the next-up queue, one user is shifted from the main queue to the next-up queue to replace them, and the bot says `NotHereAnymore is no longer in the queue` followed by the normal `!queue shift 1` response.
		- If the given user is not in the next-up queue, the bot says in chat `NotHereAnymore wasn't up next`.
	- `shift` - Usage: `!queue shift 2` or `!queue shift TwitchUser`
		- If this is a number, that many users are grabbed from the front of the main queue, added to the next-up queue, and the bot says in chat what it says for `!queue next X`.
		- If this is a username, that user is grabbed from the main queue, added to the next-up queue, and the bot says in chat: `TwitchUser is also up next`.
		- If the given user is not in the main queue, they are **not** added to the next-up queue, and the bot says in chat: `TwitchUser wasn't in the queue`.
	- `unshift` - Usage: `!queue unshift 2` or `!queue unshift TwitchUser`
		- If this is a number, that many users are grabbed from the end of the next-up queue, added to the front of the main queue, and the bot says in chat: `There is now 1 user next up`.
		- If any of those users are already in the main queue, they are **not** added twice, and the message is the same.
		- If this is a username, that user is grabbed from the next up queue, added to the front of the queue, and the bot says in chat: `TwitchUser is now at the front of the queue`.
		- If the given user is not in the next up queue, they are **not** added to the main queue, and the bot says in chat: `TwitchUser wasn't up next`.
		- If the given user is already in the main queue, they are **not** added twice, and the bot says in chat: `TwitchUser is back in the queue at position 3`.
	- `on` - Usage: `!queue on`
		- Turns the queue on so everything above can be used. The bot says in chat: `The queue is on`.
	- `off` - Usage: `!queue off`
		- Turns the queue off so everything above except for `on` cannot be used. The bot says in chat: `The queue is off`.

# Usage hints
- Given usernames in command arguments are case insensitive, and `@` prefix is allowed. The names will appear in the queues as their display names.
- If a number of users is moved from one queue to another that exceeds the length of the source queue, the number stops at the length of the source queue.
- If there's any problem with reading any of the files, their contents will be reset to a default.
- The script makes no attempt to block any user from performing any action. If you want to add restrictions, it must be done in the command trigger before the script is run.

# Upcoming features
- If you look at the contents of the next up queue file, you'll notice it isn't just a queue, but there's a `code` section as well. The upcoming feature will whisper this value to the users in the next up queue.
