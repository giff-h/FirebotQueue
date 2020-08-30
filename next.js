/**
 * Builds chat messages for displaying the next users in queue, as requested
 * This will spread users across multiple messages to never exceed the
 * twitch chat size limit of 500
 *
 * @param {!Array<string>} nextUp The users to display
 * @return {!Array<object>} The list of chat effects
 */
function _buildNextUpChatEffects(nextUp) {
	const chatEffects = [];

	// Short-circuit if there's nothing to say
	if (nextUp.length === 0) {
		return chatEffects;
	}

	let message = `Next ${nextUp.length} in queue: ${nextUp.splice(0, 1)[0]}`,
		tempMessage = message;

	while (nextUp.length > 0) {
		tempMessage += `, ${nextUp[0]}`;

		if (tempMessage.length > 500) {
			// `tempMessage` is overfull, `message` is as big as it can be, but we have more users to report
			chatEffects.push({
				type: EffectType.CHAT,
				message
			});
			message = `Also: ${nextUp.splice(0, 1)[0]}`;
			tempMessage = message;
		} else {
			message = tempMessage;
			nextUp.splice(0, 1);
		}
	}

	// No more people, add the last chat message
	chatEffects.push({
		type: EffectType.CHAT,
		message
	});

	return chatEffects;
}

function getDefaultParameters() {
	return new Promise((resolve) => {
		resolve({
			queue: {
				type: "filepath",
				description: "The .json file that contains the queue",
			}
		});
	});
}

function run(runRequest) {
	const
		result = { success: false, errorMessage: "", effects: [] },
		logger = runRequest.modules.logger,
		fs = runRequest.modules.fs,
		queueFile = runRequest.parameters.queue,
		nextCount = runRequest.command.args[1].trim();

	// Important bits of queue are:
	// - `results` which tells Firebot what to do. I default to an unsuccessful run so I
	// only set success to true once everything has run successfully
	// - `queueFile` is just the file path, it needs to be loaded manually
	// - `nextCount` is the part after "!queue next"

	// Everything else:
	// - `logger` is used to write messages to the console
	// - `fs` is filesystem access

	// If any problem happens inside `try`, it jumps straight to `catch`
	try {
		if (!isNaN(nextCount)) {
			const
				queue = JSON.parse(fs.readFileSync(queueFile)),
				nextUp = queue.splice(0, parseInt(nextCount));

			// Here we assume that `queue` is an array, this is a source of possible errors

			// array.splice(startPosition, amountToRemove)
			// This returns the items removed as a new array, and modifies the queue in place
			// This works fine if `amountToRemove` is more than the size of the queue

			logger.debug(`Grabbing the next ${nextCount} users in queue`);
			logger.debug(nextUp);

			result.effects.push({
				type: EffectType.TEXT_TO_FILE,
				filepath: queueFile,
				writeMode: "replace",
				text: JSON.stringify(queue)
			},
			..._buildNextUpChatEffects(nextUp));
		} else {
			logger.debug("Could not parse count from the arguments");
			logger.debug(runRequest.command.args);
		}
		result.success = true;
	} catch {
		// If anything went wrong, currently we assume it was a problem with the queue file, so we reset it

		logger.error("Something went wrong when grabbing users from the queue, possibly it wasn't actually an array? It is now.");

		result.effects.push({
			type: EffectType.TEXT_TO_FILE,
			filepath: queueFile,
			writeMode: "replace",
			text: JSON.stringify([])
		},
		{
			type: EffectType.CHAT,
			message: "There was a problem with the queue, it is now empty"
		});
		result.success = true;  // I still consider this successful, because the command finished
	} finally {
		// This is how Firebot operates, with callbacks. It's mostly how Javascript does asynchronous

		return new Promise(resolve => {
			resolve(result);
		});
	}
}

exports.run = run;
exports.getDefaultParameters = getDefaultParameters;
