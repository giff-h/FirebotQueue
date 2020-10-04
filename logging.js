/*
EffectType = {
	API_BUTTON: "firebot:api"
	CELEBRATION: "firebot:celebration"
	CHANGE_GROUP: null
	CHANGE_GROUP_SCENE: null
	CHANGE_SCENE: null
	CHANGE_USER_SCENE: null
	CHAT: "firebot:chat"
	CLEAR_EFFECTS: null
	COMMAND_LIST: null
	COOLDOWN: null
	CREATE_CLIP: "firebot:clip"
	CUSTOM_SCRIPT: "firebot:customscript"
	DELAY: "firebot:delay"
	DICE: "firebot:dice"
	EFFECT_GROUP: "firebot:run-effect-list"
	GAME_CONTROL: "firebot:controlemulation"
	GROUP_LIST: null
	HTML: "firebot:html"
	PLAY_SOUND: "firebot:playsound"
	RANDOM_EFFECT: "firebot:randomeffect"
	RUN_COMMAND: null
	SCENE_LIST: null
	SHOW_EVENTS: null
	SHOW_IMAGE: "firebot:showImage"
	SHOW_TEXT: "firebot:showtext"
	SHOW_VIDEO: "firebot:playvideo"
	TEXT_TO_FILE: "firebot:filewriter"
	TOGGLE_CONNECTION: "firebot:toggleconnection"
	UPDATE_BUTTON: null
}
*/

function run(runRequest) {
	const
		result = { success: true, effects: [] },
		logger = runRequest.modules.logger;

	logger.info(logger);

	return new Promise(resolve => {
		resolve(result);
	});
}

exports.run = run;
