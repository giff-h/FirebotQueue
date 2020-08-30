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
		result = { success: false, errorMessage: "A critical error happened with 'remove'", effects: [] },
		logger = runRequest.modules.logger,
		fs = runRequest.modules.fs,
		queueFile = runRequest.parameters.queue,
		rawUser = runRequest.command.args[1];

	// Important bits of queue are:
	// - `results` which tells Firebot what to do. I default to an unsuccessful run so I
	// only set success to true once everything has run successfully
	// - `queueFile` is just the file path, it needs to be loaded manually
	// - `rawUser` is the part after "!queue remove"

	// Everything else:
	// - `logger` is used to write messages to the console
	// - `fs` is filesystem access

	// If any problem happens inside `try`, it jumps straight to `catch`
	try {
		if (typeof rawUser === "string") {
			const queue = JSON.parse(fs.readFileSync(queueFile));
			let user = rawUser.trim().toLowerCase();
			if (user.startsWith("@")) {
				user = user.substr(1);
			}
			const userIndex = queue.indexOf(user);

			// Here we assume that `queue` is an array, this is a source of possible errors
			// `userIndex` is either -1 if not found, or the position in queue starting at 0

			if (userIndex === -1) {
				logger.debug(`Not removing ${user}, not in the queue`);
				result.effects.push({
					type: EffectType.CHAT,
					message: `${user} isn't in the queue`
				});
			} else {
				logger.debug(`Removing ${user} from the queue`);
				queue.splice(userIndex, 1);  // array.splice(startPosition, amountToRemove)
				result.effects.push({
					type: EffectType.TEXT_TO_FILE,
					filepath: queueFile,
					writeMode: "replace",
					text: JSON.stringify(queue)
				},
				{
					type: EffectType.CHAT,
					message: `${user} has been removed from the queue`
				});
			}
		} else {
			logger.debug("Could not parse a username from the arguments");
			logger.debug(runRequest.command.args);
		}

		result.success = true;
	} catch {
		// If anything went wrong, currently we assume it was a problem with the queue file, so we reset it

		logger.error("Something went wrong when removing a user from the queue, possibly it wasn't actually an array? It is now.");

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
