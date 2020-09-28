import actions from "./actions";
import { restoreQueueEffects } from "./effects";
import { BallOfPower, BaseEffect, EffectTypeType, RunRequest, RunResults } from "./firebot.model";
import { loadQueue } from "./utils";

declare const EffectType: EffectTypeType;

/**
 * The main dispatch of the script.
 * @param ball All of Firebot's given data
 * @returns The effects to return to Firebot
 */
function handle(ball: BallOfPower): BaseEffect[] {
	const trigger = ball.runRequest.command.trigger;

	let effects: BaseEffect[] = [];

	if (trigger in actions) {
		const action = actions[trigger];

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
export function run(runRequest: RunRequest): Promise<any> {
	const
		ball: BallOfPower = {
			runRequest,
			effectType: EffectType
		},
		result: RunResults = {
			success: true,
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
