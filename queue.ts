namespace Types {
	/* Firebot givens */

	export interface EffectTypeType {
		API_BUTTON: string;
		CELEBRATION: string;
		CHANGE_GROUP: unknown;
		CHANGE_GROUP_SCENE: unknown;
		CHANGE_SCENE: unknown;
		CHANGE_USER_SCENE: unknown;
		CHAT: string;
		CLEAR_EFFECTS: unknown;
		COMMAND_LIST: unknown;
		COOLDOWN: unknown;
		CREATE_CLIP: string;
		CUSTOM_SCRIPT: string;
		DELAY: string;
		DICE: string;
		EFFECT_GROUP: string;
		GAME_CONTROL: string;
		GROUP_LIST: unknown;
		HTML: string;
		PLAY_SOUND: string;
		RANDOM_EFFECT: string;
		RUN_COMMAND: unknown;
		SCENE_LIST: unknown;
		SHOW_EVENTS: unknown;
		SHOW_IMAGE: string;
		SHOW_TEXT: string;
		SHOW_VIDEO: string;
		TEXT_TO_FILE: string;
		TOGGLE_CONNECTION: string;
		UPDATE_BUTTON: unknown;
	}

	export interface FirebotCommand {
		args: string[];
		commandSender: string;
		senderRoles: unknown[];
		subcommandId: unknown;
		trigger: string;
		triggeredArg: unknown;
	}

	export interface FirebotFS {
		readFileSync: (pathArgument: string, options: any) => any;
	}

	export interface FirebotModules {
		chat: unknown;
		childProcess: unknown;
		fs: FirebotFS;
		logger: any;
		mixplay: unknown;
		path: unknown;
		twitchChat: unknown;
		utils: unknown;
	}

	export interface RunRequest {
		command: FirebotCommand;
		control: unknown;
		firebot: unknown;
		modules: FirebotModules;
		parameters: any;
		trigger: unknown;
		user: unknown;
	}

	export interface BallOfPower {
		runRequest: RunRequest;
		effectType: EffectTypeType;
	}

	/* Effects */

	export interface BaseEffect {
		type: EffectTypeType[keyof EffectTypeType];
	}

	export interface ChatMessageEffect extends BaseEffect {
		type: EffectTypeType["CHAT"];
		message: string;
	}

	export interface WriteFileEffect extends BaseEffect {
		type: EffectTypeType["TEXT_TO_FILE"];
		filepath: string;
		writeMode: "append" | "delete" | "replace-line" | "delete-all" | "replace";
		text: string;
	}

	/* Misc */

	export interface RunResults {
		success: boolean;
		errorMessage?: string;
		effects: Types.BaseEffect[];
	}

	export interface QueueRestoreOptions {
		user?: string;
	}
}

namespace Utils {
	/**
	 * Check if something is a string. Mostly exists for the typing.
	 * @param x Can be anything
	 */
	export function isString(x: unknown): x is string {
		return typeof x === "string";
	}

	/**
	 * Check if something is an array of strings, which is the required queue structure.
	 * @param hopefulQueue Can be anything
	 */
	function isValidQueue(hopefulQueue: unknown): hopefulQueue is string[] {
		if (Array.isArray(hopefulQueue)) {
			for (let i = 0; i < hopefulQueue.length; i++) {
				if (!isString(hopefulQueue[i])) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	/**
	 * Look up the name of the user from Firebot data
	 * @param ball All of Firebot's given data
	 * @returns The username of who invoked the command
	 */
	export function fetchSender(ball: Types.BallOfPower): string {
		return ball.runRequest.command.commandSender;
	}

	/**
	 * Load the queue from wherever it's stored. If there's any problem with this, an error is raised
	 * and handled elsewhere so the proper effects can happen
	 * @param ball All of Firebot's given data
	 * @returns The fabled queue
	 */
	export function loadQueue(ball: Types.BallOfPower): string[] {
		const queue = JSON.parse(ball.runRequest.modules.fs.readFileSync(ball.runRequest.parameters.queue, "utf-8"));

		if (isValidQueue(queue)) {
			return queue;
		} else {
			throw new Error("Invalid queue file structure");
		}
	}

	/**
	 * Parse a username from a given value. If the value isn't a string, returns `null`
	 * @param raw The value that should be a username
	 * @returns The username without leading `@`, or `null`
	 */
	export function hopefulUserName(raw: any): string | null {
		if (isString(raw)) {
			raw = raw.trim();
			return raw.startsWith("@") ? raw.substring(1) : raw;
		} else {
			return null;
		}
	}

	/**
	 * Performs a case insensitive index search for a user in the queue
	 * @param queue The fabled queue
	 * @param user The user to find in the queue
	 */
	export function userIndexInQueue(queue: string[], user: string): number {
		return queue.map(u => u.toUpperCase()).indexOf(user.toUpperCase());
	}
}

namespace Effects {
	/**
	 * If the user is in the queue, does nothing, and returns the appropriate chat effect.
	 * If the user is not in the queue, adds, and returns the appropriate chat effect.
	 * @param ball All of Firebot's given data
	 * @param queue The fabled queue
	 * @param user The user to add to the queue
	 * @returns The effect to return to Firebot
	 */
	export function userAddedToQueueEffect(ball: Types.BallOfPower, queue: string[], user: string): Types.ChatMessageEffect {
		const
			effect: Types.ChatMessageEffect = {
				type: ball.effectType.CHAT,
				message: ""
			},
			userIndex = Utils.userIndexInQueue(queue, user);

		if (userIndex === -1) {
			queue.push(user);
			effect.message = `${user} added to the queue at position ${queue.length}`;
		} else {
			effect.message = `${queue[userIndex]} is already in the queue at position ${userIndex}`;
		}

		return effect;
	}

	/**
	 * If the user is in the queue, removes, and returns the appropriate chat effect.
	 * If the user is not in the queue, does nothing, and returns the appropriate chat effect.
	 * @param ball All of Firebot's given data
	 * @param queue The fabled queue
	 * @param user The user to remove from the queue
	 * @returns The effect to return to Firebot
	 */
	export function userRemovedFromQueueEffect(ball: Types.BallOfPower, queue: string[], user: string): Types.ChatMessageEffect {
		const
			effect: Types.ChatMessageEffect = {
				type: ball.effectType.CHAT,
				message: ""
			},
			userIndex = Utils.userIndexInQueue(queue, user);

		if (userIndex === -1) {
			effect.message = `${user} wasn't in the queue`;
		} else {
			effect.message = `${queue.splice(userIndex, 1)[0]} is no longer in the queue`;
		}

		return effect;
	}

	/**
	 * Reports all the users in the array as chat messages, comma-separated. Since the size of this list is unbound, it can be many messages.
	 * @param ball All of Firebot's given data
	 * @param users The array of users to report
	 * @param initialPrefix The part of the first message before the users. Result: `"<initialPrefix>: user1, user2, user3"`
	 * @param subsequentPrefix The part of the additional messages before the users. Result: `"<subsequentPrefix>: user82, user83, user84"`
	 * @returns The effects to return to Firebot
	 */
	export function usersInListEffects(ball: Types.BallOfPower, users: string[], initialPrefix: string, subsequentPrefix: string): Types.ChatMessageEffect[] {
		const effects: Types.ChatMessageEffect[] = [];

		if (users.length === 0) {
			return effects;
		}

		let message = `${initialPrefix}: ${users.splice(0, 1)[0]}`,
			tempMessage = message;

		while (users.length > 0) {
			tempMessage += `, ${users[0]}`;

			if (tempMessage.length > 500) {
				// `tempMessage` is overfull, `message` is as big as it can be, but we have more users to report
				effects.push({
					type: ball.effectType.CHAT,
					message
				});
				tempMessage = message = `${subsequentPrefix}: ${users.splice(0, 1)[0]}`;
			} else {
				message = tempMessage;
				users.splice(0, 1);
			}
		}

		// No more people, add the last chat message
		effects.push({
			type: ball.effectType.CHAT,
			message
		});

		return effects;
	}

	/**
	 * Creates the effect to write a list of users to a file.
	 * @param ball All of Firebot's given data
	 * @param filepath The path of the file to be written
	 * @param users The array of users to save
	 * @returns The effect to return to Firebot
	 */
	export function persistUsersToFileEffect(ball: Types.BallOfPower, filepath: string, users: string[]): Types.BaseEffect {
		return {
			type: ball.effectType.TEXT_TO_FILE,
			filepath,
			writeMode: "replace",
			text: JSON.stringify(users)
		} as Types.WriteFileEffect;
	}

	/**
	 * Creates the effects to restore the queue in the event of a problem.
	 * @param ball All of Firebot's given data
	 * @param options Any extra data to alter the effect
	 * @returns The effects to return to Firebot
	 */
	export function restoreQueueEffects(ball: Types.BallOfPower, options?: Types.QueueRestoreOptions): Types.BaseEffect[] {
		const
			user = options?.user,
			userGiven = Utils.isString(user),
			queue: string[] = userGiven ? [user] : [];

		return [
			persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
			{
				type: ball.effectType.CHAT,
				message: "There was a problem with the queue, it is now " + (userGiven ? `just ${user}` : "empty")
			} as Types.ChatMessageEffect
		]
	}
}

namespace Actions {
	interface Action {
		effects: (ball: Types.BallOfPower, queue: string[]) => Types.BaseEffect[];
		restore?: (ball: Types.BallOfPower) => Types.QueueRestoreOptions;
	}

	interface Actions {
		[trigger: string]: Action;
	}

	/**
	 * The object that contains the command and argument dispatch actions
	 */
	export const actions: Actions = {
		"!join": {
			effects: function (ball: Types.BallOfPower, queue: string[]): Types.BaseEffect[] {
				const
					sender = Utils.fetchSender(ball),
					chatEffect = Effects.userAddedToQueueEffect(ball, queue, sender);

				return [
					Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
					chatEffect
				];
			},
			restore: function (ball: Types.BallOfPower): Types.QueueRestoreOptions {
				return {
					user: Utils.fetchSender(ball)
				};
			}
		},

		"!leave": {
			effects: function (ball: Types.BallOfPower, queue: string[]): Types.BaseEffect[] {
				const
					sender = Utils.fetchSender(ball),
					chatEffect = Effects.userRemovedFromQueueEffect(ball, queue, sender);

				return [
					Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
					chatEffect
				];
			}
		},

		"!rejoin": {
			effects: function (ball: Types.BallOfPower, queue: string[]): Types.BaseEffect[] {
				const
					sender = Utils.fetchSender(ball),
					leaveEffect = Effects.userRemovedFromQueueEffect(ball, queue, sender),
					joinEffect = Effects.userAddedToQueueEffect(ball, queue, sender);

				return [
					Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
					leaveEffect,
					joinEffect
				];
			},
			restore: function (ball: Types.BallOfPower): Types.QueueRestoreOptions {
				return {
					user: Utils.fetchSender(ball)
				};
			}
		},

		"!queue": {
			effects: function (ball: Types.BallOfPower, queue: string[]): Types.BaseEffect[] {
				const
					verb = ball.runRequest.command.args[0].trim().toLowerCase(),
					effects: Types.BaseEffect[] = [];

				switch (verb) {
					case "remove": {
						const user = Utils.hopefulUserName(ball.runRequest.command.args[1]);

						if (user !== null) {
							const chatEffect = Effects.userRemovedFromQueueEffect(ball, queue, user);
							effects.push(
								Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
								chatEffect
							);
						}
						break;
					}
					case "next": {
						const nextCount = Number(ball.runRequest.command.args[1].trim());

						if (!isNaN(nextCount)) {
							const nextUp = queue.splice(0, nextCount);
							effects.push(
								Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
								Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.next, nextUp),
								...Effects.usersInListEffects(ball, nextUp, `Next ${nextCount} in queue`, "Also")
							);
						}
						break;
					}
				}

				return effects;
			}
		}
	};
}

declare const EffectType: Types.EffectTypeType;

/**
 * The main dispatch of the script.
 * @param ball All of Firebot's given data
 * @returns The effects to return to Firebot
 */
function handle(ball: Types.BallOfPower): Types.BaseEffect[] {
	const trigger = ball.runRequest.command.trigger;

	let effects: Types.BaseEffect[] = [];

	if (trigger in Actions.actions) {
		const action = Actions.actions[trigger];

		let queue: string[] = [],
			isQueueValid = true;

		try {
			queue = Utils.loadQueue(ball);
		} catch {
			isQueueValid = false;
		}

		if (isQueueValid) {
			effects = action.effects(ball, queue);
		} else {
			if ("restore" in action) {
				effects = Effects.restoreQueueEffects(ball, action.restore(ball));
			} else {
				effects = Effects.restoreQueueEffects(ball);
			}
		}
	}

	return effects;
}

/**
 * Firebot script parameters function
 */
export function getDefaultParameters(): Promise<any> {
	return new Promise(resolve => {
		resolve({
			queue: {
				type: "filepath",
				description: "The .json file that contains the queue"
			},
			next: {
				type: "filepath",
				description: "The .json file that holds the users grabbed by !queue next X"
			}
		});
	});
}

/**
 * Firebot script run function
 * @param runRequest The data about the script run, provided by Firebot
 */
export function run(runRequest: Types.RunRequest): Promise<any> {
	const
		ball: Types.BallOfPower = {
			runRequest,
			effectType: EffectType
		},
		result: Types.RunResults = {
			success: true,
			effects: []
		};

	try {
		result.effects = handle(ball);
	} catch (e) {
		result.success = false;
		result.errorMessage = e.toString();
	}

	return new Promise(resolve => {
		resolve(result);
	});
}
