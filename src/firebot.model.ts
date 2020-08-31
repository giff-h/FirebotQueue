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
