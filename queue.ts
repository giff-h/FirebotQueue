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

	interface FirebotCommand {
		args: string[];
		commandSender: string;
		senderRoles: unknown[];
		subcommandId: unknown;
		trigger: string;
		triggeredArg: unknown;
	}

	interface FirebotFS {
		readFileSync: (pathArgument: string, options: any) => any;
	}

	interface FirebotLogger {
		debug: (arg: string) => void;
		error: (arg: string) => void;
		info: (arg: string) => void;
		silly: (arg: string) => void;
		verbose: (arg: string) => void;
		warn: (arg: string) => void;
	}

	interface FirebotModules {
		chat: unknown;
		childProcess: unknown;
		fs: FirebotFS;
		logger: FirebotLogger;
		mixplay: unknown;
		path: unknown;
		twitchChat: unknown;
		utils: unknown;
	}

	interface ScriptParameters {
		queue: string;
		next: string;
	}

	export interface RunRequest {
		command: FirebotCommand;
		control: unknown;
		firebot: unknown;
		modules: FirebotModules;
		parameters: ScriptParameters;
		trigger: unknown;
		user: unknown;
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

	export interface ComplexQueue {
		queue: string[];
		code?: string;
	}

	export type ScriptParameterDefinition = {
		[P in keyof ScriptParameters]: { type: string, description: string };
	}

	export interface RunResult {
		success: boolean;
		errorMessage?: string;
		effects: Types.BaseEffect[];
	}
}

declare const EffectType: Types.EffectTypeType;  // This is available in the outer scope, from Firebot

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
	export function isValidQueue(hopefulQueue: unknown): hopefulQueue is string[] {
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
	 * @param users The fabled queue
	 * @param user The user to find in the queue
	 */
	export function userIndexInArray(users: string[], user: string): number {
		return users.map(u => u.toUpperCase()).indexOf(user.toUpperCase());
	}

	/**
	 * Build the structure of the chat message effect.
	 * @param message An optional message for rapid construction, defaults to an empty string.
	 * @returns The chat effect to return to Firebot
	 */
	export function chatMessageEffect(message: string = ""): Types.ChatMessageEffect {
		return {
			type: EffectType.CHAT,
			message: message
		};
	}
}

class QueueManager {
	readonly effects: Types.BaseEffect[];  // The effects to return to Firebot
	readonly queueCache: Record<string, any>;  // The cache is also used to know what files to persist at the end
	readonly runRequest: Types.RunRequest;  // The data given by Firebot

	constructor(runRequest: Types.RunRequest) {
		this.runRequest = runRequest;

		this.effects = [];
		this.queueCache = {};
	}

	logDebug(message: any): void {
		this.runRequest.modules.logger.debug(message);
	}
	logInfo(message: any): void {
		this.runRequest.modules.logger.info(message);
	}
	logWarn(message: any): void {
		this.runRequest.modules.logger.warn(message);
	}

	/**
	 * If the main queue was loaded, and not changed, use this to prevent it from being unnecessarily rewritten.
	 */
	uncacheQueue(): void {
		delete this.queueCache[this.runRequest.parameters.queue];
	}

	/**
	 * If the next-up queue was loaded, and not changed, use this to prevent it from being unnecessarily rewritten.
	 */
	uncacheNext(): void {
		delete this.queueCache[this.runRequest.parameters.next];
	}

	/**
	 * Build the Firebot effects to populate the queues from the cache to their respective files.
	 * @returns The effects to return to Firebot
	 */
	persistEffects(): Types.WriteFileEffect[] {
		const effects: Types.WriteFileEffect[] = [];
		for (let filepath in this.queueCache)  {
			effects.push({
				type: EffectType.TEXT_TO_FILE,
				filepath,
				writeMode: "replace",
				text: JSON.stringify(this.queueCache[filepath])
			});
		}
		return effects;
	}

	/**
	 * Load the given file, parse the data, and default to the given `default_data` if there's any problem, or the data is invalid.
	 * If the data is parsed successfully, `validator` is called to verify its authenticity.
	 * The final result is cached by the filepath in case it's accessed multiple times while handling a command.
	 * @param filepath The path of the file to be read
	 * @param default_data The value to use in the event of any problem
	 * @param validator The function to validate the data, might receive any valid JSON.parse result
	 */
	loadDataFromFile<T>(filepath: string, default_data: T, validator: (data: unknown) => data is T): T {
		if (filepath in this.queueCache) {
			return this.queueCache[filepath];
		} else {
			let data = default_data;

			try {
				data = JSON.parse(this.runRequest.modules.fs.readFileSync(filepath, "utf-8"));
			} catch {
				this.logWarn("There was an error reading from the file");
			}

			if (!validator(data)) {
				this.logWarn("The file structure was not correct");
				data = default_data;
			}

			this.queueCache[filepath] = data;
			return data;
		}
	}

	/**
	 * The main queue
	 */
	get queue(): string[] {
		const
			default_data: string[] = [],
			validator = (data: unknown) => Utils.isValidQueue(data);

		return this.loadDataFromFile(this.runRequest.parameters.queue, default_data, validator as (data: unknown) => data is string[]);
	}

	/**
	 * The next-up queue
	 */
	get next(): Types.ComplexQueue {
		const
			default_data: Types.ComplexQueue = { queue: [], code: "" },
			validator = (data: Types.ComplexQueue) => {
				if (typeof data !== "object" || Utils.isValidQueue(data.queue)) {
					return false;
				} else if (!Utils.isString(data.code)) {
					data.code = "";
				}
				return true;
			};

		return this.loadDataFromFile(this.runRequest.parameters.next, default_data, validator as (data: unknown) => data is Types.ComplexQueue);
	}

	/**
	 * The user who sent the command
	 */
	get sender(): string {
		return this.runRequest.command.commandSender;
	}

	/**
	 * The main trigger of the command
	 */
	get trigger(): string {
		return this.runRequest.command.trigger;
	}

	/**
	 * Load the n-th word after the command invoke. This is zero-indexed.
	 * E.g. "!queue [0]next [1]7"
	 * @param n The argument position
	 * @returns The argument value
	 */
	commandArgument(n: number): string | undefined {
		return this.runRequest.command.args[n];
	}

	/**
	 * Add the given user to the main queue, and report the position in chat.
	 * If the user is already in the queue, nothing happens, but the position is still reported.
	 * The case of the user does not matter, but will persist if it was not found.
	 * @param user The user to add to the main queue
	 * @returns The chat effect to return to Firebot
	 */
	addUserToQueueEffect(user: string): Types.ChatMessageEffect {
		const
			queue = this.queue,
			effect = Utils.chatMessageEffect(),
			userIndex = Utils.userIndexInArray(queue, user);

		if (userIndex === -1) {
			queue.push(user);
			effect.message = `${user} added to the queue at position ${queue.length}`;
		} else {
			this.uncacheQueue();
			user = queue[userIndex];
			effect.message = `${user} is already in the queue at position ${userIndex + 1}`;
		}

		return effect;
	}

	/**
	 * Remove the given user from the main queue, and report in chat.
	 * If the user is not in the queue, nothing happens, and the absence is reported.
	 * The case of the user does not matter.
	 * @param user The user to remove from the main queue
	 * @returns The chat effect to return to Firebot
	 */
	removeUserFromQueueEffect(user: string): Types.ChatMessageEffect {
		const
			queue = this.queue,
			effect = Utils.chatMessageEffect(),
			userIndex = Utils.userIndexInArray(queue, user);

		if (userIndex === -1) {
			this.uncacheQueue();
			effect.message = `${user} wasn't in the queue`;
		} else {
			user = queue.splice(userIndex, 1)[0];
			effect.message = `${user} is no longer in the queue`;
		}

		return effect;
	}

	/**
	 * Remove the given user from the main queue, re-add at the end, and report the position in chat.
	 * If the user is not in the queue, it's added anyway.
	 * The case of the user does not matter, but it will persist if it was not found.
	 * @param user The user to reposition in the main queue
	 * @returns The chat effect to return to Firebot
	 */
	resetUserInQueueEffect(user: string): Types.ChatMessageEffect {
		const
			queue = this.queue,
			userIndex = Utils.userIndexInArray(queue, user);

		if (userIndex !== -1) {
			user = queue.splice(userIndex, 1)[0];
		}

		queue.push(user);
		return Utils.chatMessageEffect(`${user} is now at the end of the queue at position ${queue.length}`);
	}

	/**
	 * Take some users from the front of the main queue, put them in the next-up queue, and report the next-up queue in chat.
	 * If the count is 0, nothing happens, and nothing is reported.
	 * This is aware of the chat message size limit of 500 characters, and splits the report across multiple messages if necessary.
	 * @param count The number of users to move
	 * @returns The chat effects to return to Firebot
	 */
	shiftSomeUsersToNextEffects(count: number): Types.ChatMessageEffect[] {
		if (count === 0) {
			return [];
		}

		const
			queue = this.queue,
			next = this.next.queue,
			effects: Types.ChatMessageEffect[] = [];

		next.push(...queue.splice(0, count));

		const users = Object.assign([], next);
		let message = `Next ${next.length} in queue: ${users.splice(0, 1)[0]}`,
			tempMessage = message;

		while (users.length > 0) {
			tempMessage += `, ${users[0]}`;

			if (tempMessage.length > 500) {
				// `tempMessage` is overfull, `message` is as big as it can be, but we have more users to report
				effects.push(Utils.chatMessageEffect(message));
				tempMessage = message = `Also: ${users.splice(0, 1)[0]}`;
			} else {
				message = tempMessage;
				users.splice(0, 1);
			}
		}

		// No more people, add the last chat message
		effects.push(Utils.chatMessageEffect(message));

		return effects;
	}

	/**
	 * Take one user from the main queue, put them in the next-up queue, and report in chat.
	 * If the user is not in the queue, nothing happens, and the absence is reported.
	 * @param user The user to move
	 * @returns The chat effect to return to Firebot
	 */
	shiftOneUserToNextEffects(user: string): Types.ChatMessageEffect {
		const
			queue = this.queue,
			effect = Utils.chatMessageEffect(),
			userIndex = Utils.userIndexInArray(queue, user);

		if (userIndex === -1) {
			this.uncacheQueue();
			effect.message = `${user} wasn't in the queue`;
		} else {
			const next = this.next.queue;
			user = queue.splice(userIndex, 1)[0];
			next.push(user);
			effect.message = `${user} is also up next`;
		}

		return effect;
	}

	/**
	 * Take some users from the end of the next-up queue, put them at the front of the main queue, and report the next-up size in chat.
	 * If the count is 0, nothing happens, and an appropriate message is reported.
	 * @param count The number of users to move
	 * @returns The chat effect to return to Firebot
	 */
	unshiftSomeUsersFromNextEffect(count: number): Types.ChatMessageEffect {
		if (count === 0) {
			return Utils.chatMessageEffect("That wouldn't do anything");
		}

		const
			queue = this.queue,
			next = this.next.queue;

		queue.unshift(...next.splice(next.length - count, count));
		return Utils.chatMessageEffect(`There ${next.length === 1 ? "is" : "are"} now ${next.length} ${next.length === 1 ? "user" : "users"} next up`);
	}

	/**
	 * Take one user from the next-up queue, put them at the front of the main queue, and report in chat.
	 * If the user is not in the queue, nothing happens, and the absence is reported.
	 * @param user The user to move
	 * @returns The chat effect to return to Firebot
	 */
	unshiftOneUserFromNextEffect(user: string): Types.ChatMessageEffect {
		const
			next = this.next.queue,
			effect = Utils.chatMessageEffect(),
			userIndex = Utils.userIndexInArray(next, user);

		if (userIndex === -1) {
			this.uncacheNext();
			effect.message = `${user} wasn't up next`;
		} else {
			const queue = this.queue;
			user = next.splice(userIndex, 1)[0];
			queue.unshift(user);
			effect.message = `${user} is now at the front of the queue`;
		}

		return effect;
	}
}

/**
 * The object that contains the command and argument dispatch actions
 */
const actions: Record<string, (manager: QueueManager) => Types.BaseEffect[]> = {
	"!join": (manager: QueueManager) => {
		const chatEffect = manager.addUserToQueueEffect(manager.sender);
		
		return [...manager.persistEffects(), chatEffect];
	},

	"!leave": (manager: QueueManager) => {
		const chatEffect = manager.removeUserFromQueueEffect(manager.sender);

		return [...manager.persistEffects(), chatEffect];
	},

	"!rejoin": (manager: QueueManager) => {
		const chatEffect = manager.resetUserInQueueEffect(manager.sender);

		return [...manager.persistEffects(), chatEffect];
	},

	"!queue": (manager: QueueManager) => {
		const
			verb = manager.commandArgument(0),
			effects: Types.BaseEffect[] = [];

		if (Utils.isString(verb)) {
			switch (verb.trim().toLowerCase()) {
				case "next": {
					const nextArg = manager.commandArgument(1);

					if (Utils.isString(nextArg)) {
						const nextCount = Number(nextArg.trim());

						if (!isNaN(nextCount) && nextCount !== 0) {
							manager.next.queue.splice(0, manager.next.queue.length);
							const chatEffects = manager.shiftSomeUsersToNextEffects(nextCount);
							effects.push(...manager.persistEffects());
							effects.push(...chatEffects);
						}
					}
					break;
				}
				case "remove": {
					const user = Utils.hopefulUserName(manager.commandArgument(1));

					if (user !== null) {
						const chatEffect = manager.removeUserFromQueueEffect(user);
						effects.push(...manager.persistEffects());
						effects.push(chatEffect);
					}
					break;
				}
				case "shift": {
					const shiftArg = manager.commandArgument(1);

					if (Utils.isString(shiftArg)) {
						const shiftCount = Number(shiftArg.trim());

						if (isNaN(shiftCount)) {
							const user = Utils.hopefulUserName(shiftArg);

							if (user !== null) {
								const chatEffect = manager.shiftOneUserToNextEffects(user);
								effects.push(...manager.persistEffects());
								effects.push(chatEffect);
							}
						} else if (shiftCount !== 0) {
							const chatEffects = manager.shiftSomeUsersToNextEffects(shiftCount);
							effects.push(...manager.persistEffects());
							effects.push(...chatEffects);
						}
					}
					break;
				}
				case "unshift": {
					const unshiftArg = manager.commandArgument(1);

					if (Utils.isString(unshiftArg)) {
						const unshiftCount = Number(unshiftArg.trim());

						if (isNaN(unshiftCount)) {
							const user = Utils.hopefulUserName(unshiftArg);

							if (user !== null) {
								const chatEffect = manager.unshiftOneUserFromNextEffect(user);
								effects.push(...manager.persistEffects());
								effects.push(chatEffect);
							}
						} else if (unshiftCount !== 0) {
							const chatEffect = manager.unshiftSomeUsersFromNextEffect(unshiftCount);
							effects.push(...manager.persistEffects());
							effects.push(chatEffect);
						}
					}
					break;
				}
				default: {
					manager.logWarn("!queue verb not handled: " + verb);
					break;
				}
			}
		}

		return effects;
	}
};

/**
 * The main dispatch of the script.
 * @param runRequest The data given by Firebot
 * @returns The effects to return to Firebot
 */
function handle(runRequest: Types.RunRequest): Types.BaseEffect[] {
	const
		manager = new QueueManager(runRequest),
		trigger = manager.trigger;

	let effects: Types.BaseEffect[] = [];

	if (trigger in actions) {
		manager.logDebug("Acting on the trigger: " + trigger);
		effects.push(...actions[trigger](manager))
	} else {
		manager.logWarn("The expected trigger was not actionable: " + trigger);
	}

	return effects;
}

/**
 * Firebot script parameters function
 */
export function getDefaultParameters(): Promise<Types.ScriptParameterDefinition> {
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
export function run(runRequest: Types.RunRequest): Promise<Types.RunResult> {
	const result: Types.RunResult = {
		success: true,
		effects: []
	};

	try {
		result.effects = handle(runRequest);
	} catch (e) {
		result.success = false;
		result.errorMessage = e.toString();
	}

	return new Promise(resolve => {
		resolve(result);
	});
}
