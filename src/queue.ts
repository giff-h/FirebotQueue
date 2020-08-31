import actions from "./actions";
import { restoreQueueEffects } from "./effects";
import { BallOfPower, BaseEffect, EffectTypeType, RunRequest } from "./firebot.model";
import { loadQueue } from "./utils";

declare const EffectType: EffectTypeType;

function handle(ball: BallOfPower): BaseEffect[] {
	const verb = ball.runRequest.command.args[0].trim().toLowerCase();

	let effects: BaseEffect[] = [];

	if (verb in actions) {
		const action = actions[verb];

		let queue: string[] = [],
			isQueueValid = true;

		try {
			queue = loadQueue(ball);
		} catch {
			isQueueValid = false;
		}

		if (isQueueValid) {
			effects = action.effects(ball, queue);
		} else {
			if ("restore" in action) {
				effects = restoreQueueEffects(ball, action.restore(ball));
			} else {
				effects = restoreQueueEffects(ball);
			}
		}
	}

	return effects;
}

export function getDefaultParameters() {
	return new Promise(resolve => {
		resolve({
			queue: {
				type: "filepath",
				description: "The .json file that contains the queue"
			}
		});
	});
}

export function run(runRequest: RunRequest) {
	const
		ball: BallOfPower = {
			runRequest,
			effectType: EffectType
		},
		result = {
			success: true,
			errorMessage: "",
			effects: []
		};

	try {
		result.effects = handle(ball);
	} catch(e) {
		result.success = false;
		result.errorMessage = e.toString();
	}

	return new Promise(resolve => {
		resolve(result);
	});
}
