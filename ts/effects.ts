import { BallOfPower, BaseEffect, ChatMessageEffect, QueueRestoreOptions, WriteFileEffect } from "./firebot.model";
import { isString } from "./utils";

/**
 * If the user is in the queue, does nothing, and returns the appropriate chat effect.
 * If the user is not in the queue, adds, and returns the appropriate chat effect.
 * @param ball All of Firebot's given data
 * @param queue The fabled queue
 * @param user The user to add to the queue
 * @returns The effect to return to Firebot
 */
export function userAddedToQueueEffect(ball: BallOfPower, queue: string[], user: string): ChatMessageEffect {
	const
		effect: ChatMessageEffect = {
			type: ball.effectType.CHAT,
			message: ""
		},
		userIndex = queue.indexOf(user);
	
	if (userIndex === -1) {
		queue.push(user);
		effect.message = `${user} added to the queue at position ${queue.length}`;
	} else {
		effect.message = `${user} is already in the queue at position ${userIndex}`;
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
export function userRemovedFromQueueEffect(ball: BallOfPower, queue: string[], user: string): ChatMessageEffect {
	const
		effect: ChatMessageEffect = {
			type: ball.effectType.CHAT,
			message: ""
		},
		userIndex = queue.indexOf(user);

	if (userIndex === -1) {
		effect.message = `${user} wasn't in the queue`;
	} else {
		queue.splice(userIndex, 1);
		effect.message = `${user} is no longer in the queue`;
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
export function usersInListEffects(ball: BallOfPower, users: string[], initialPrefix: string, subsequentPrefix: string): ChatMessageEffect[] {
	const effects: ChatMessageEffect[] = [];

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
 * Creates the effect to save the queue.
 * @param ball All of Firebot's given data
 * @param queue The fabled queue
 * @returns The effect to return to Firebot
 */
export function persistQueueEffect(ball: BallOfPower, queue: string[]): BaseEffect {
	return {
		type: ball.effectType.TEXT_TO_FILE,
		filepath: ball.runRequest.parameters.queue,
		writeMode: "replace",
		text: JSON.stringify(queue)
	} as WriteFileEffect;
}

/**
 * Creates the effects to restore the queue in the event of a problem.
 * @param ball All of Firebot's given data
 * @param options Any extra data to alter the effect
 * @returns The effects to return to Firebot
 */
export function restoreQueueEffects(ball: BallOfPower, options?: QueueRestoreOptions): BaseEffect[] {
	const
		user = options?.user,
		userGiven = isString(user),
		queue: string[] = userGiven ? [user] : [];

	return [
		persistQueueEffect(ball, queue),
		{
			type: ball.effectType.CHAT,
			message: "There was a problem with the queue, it is now " + (userGiven ? `just ${user}` : "empty")
		} as ChatMessageEffect
	]
}
