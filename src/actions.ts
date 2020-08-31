import { persistQueueEffect, QueueRestoreOptions, userAddedToQueueEffect, userRemovedFromQueueEffect, usersInListEffects } from "./effects";
import { BallOfPower, BaseEffect } from "./firebot.model";
import { fetchSender, hopefulUserName } from "./utils";

interface Action {
	effects: (ball: BallOfPower, queue: string[]) => BaseEffect[];
	restore?: (ball: BallOfPower) => QueueRestoreOptions;
}

interface Actions {
	[keys: string]: Action;
}

const actions: Actions = {
	join: {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const
				sender = fetchSender(ball),
				chatEffect = userAddedToQueueEffect(ball, queue, sender);

			return [
				persistQueueEffect(ball, queue),
				chatEffect
			];
		},
		restore: function(ball: BallOfPower): QueueRestoreOptions {
			return {
				user: fetchSender(ball)
			};
		}
	},

	leave: {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const
				sender = fetchSender(ball),
				chatEffect = userRemovedFromQueueEffect(ball, queue, sender);

			return [
				persistQueueEffect(ball, queue),
				chatEffect
			];
		}
	},

	remove: {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const user = hopefulUserName(ball.runRequest.command.args[1]);

			if (user === null) {
				return [];
			} else {
				const chatEffect = userRemovedFromQueueEffect(ball, queue, user);
				return [
					persistQueueEffect(ball, queue),
					chatEffect
				];
			}
		}
	},

	next: {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const nextCount = Number(ball.runRequest.command.args[1].trim());

			if (isNaN(nextCount)) {
				return [];
			} else {
				const nextUp = queue.splice(0, nextCount);
				return [
					persistQueueEffect(ball, queue),
					...usersInListEffects(ball, nextUp, `Next ${nextCount} in queue`, "Also")
				];
			}
		}
	}
};

export default actions;
