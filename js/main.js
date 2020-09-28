import actions from "./actions";
import { restoreQueueEffects } from "./effects";
import { loadQueue } from "./utils";
/**
 * The main dispatch of the script.
 * @param ball All of Firebot's given data
 * @returns The effects to return to Firebot
 */
function handle(ball) {
    const trigger = ball.runRequest.command.trigger;
    let effects = [];
    if (trigger in actions) {
        const action = actions[trigger];
        let queue = [], isQueueValid = true;
        try {
            queue = loadQueue(ball);
        }
        catch (_a) {
            isQueueValid = false;
        }
        if (isQueueValid) {
            effects = action.effects(ball, queue);
        }
        else {
            if ("restore" in action) {
                effects = restoreQueueEffects(ball, action.restore(ball));
            }
            else {
                effects = restoreQueueEffects(ball);
            }
        }
    }
    return effects;
}
/**
 * Firebot script parameters function
 */
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
/**
 * Firebot script run function
 * @param runRequest The data about the script run, provided by Firebot
 */
export function run(runRequest) {
    const ball = {
        runRequest,
        effectType: EffectType
    }, result = {
        success: true,
        effects: []
    };
    try {
        result.effects = handle(ball);
    }
    catch (e) {
        result.success = false;
        result.errorMessage = e.toString();
    }
    return new Promise(resolve => {
        resolve(result);
    });
}
