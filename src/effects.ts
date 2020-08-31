import { BallOfPower, BaseEffect, ChatMessageEffect, WriteFileEffect } from "./firebot.model";
import { isString } from "./utils";

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

export function persistQueueEffect(ball: BallOfPower, queue: string[]): BaseEffect {
	return {
		type: ball.effectType.TEXT_TO_FILE,
		filepath: ball.runRequest.parameters.queue,
		writeMode: "replace",
		text: JSON.stringify(queue)
	} as WriteFileEffect;
}

export interface QueueRestoreOptions {
	user?: string;
}

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
