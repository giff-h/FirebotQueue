import { persistUsersToFileEffect, userAddedToQueueEffect, userRemovedFromQueueEffect, usersInListEffects } from "./effects";
import { BallOfPower, BaseEffect, QueueRestoreOptions } from "./firebot.model";
import { fetchSender, hopefulUserName } from "./utils";

interface Action {
	effects: (ball: BallOfPower, queue: string[]) => BaseEffect[];
	restore?: (ball: BallOfPower) => QueueRestoreOptions;
}

interface Actions {
	[trigger: string]: Action;
}

/**
 * The object that contains the command and argument dispatch actions
 */
const actions: Actions = {
	"!join": {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const
				sender = fetchSender(ball),
				chatEffect = userAddedToQueueEffect(ball, queue, sender);

			return [
				persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
				chatEffect
			];
		},
		restore: function(ball: BallOfPower): QueueRestoreOptions {
			return {
				user: fetchSender(ball)
			};
		}
	},

	"!leave": {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const
				sender = fetchSender(ball),
				chatEffect = userRemovedFromQueueEffect(ball, queue, sender);

			return [
				persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
				chatEffect
			];
		}
	},

	"!queue": {
		effects: function(ball: BallOfPower, queue: string[]): BaseEffect[] {
			const
				verb = ball.runRequest.command.args[0].trim().toLowerCase(),
				effects: BaseEffect[] = [];

			switch (verb) {
				case "remove": {
					const user = hopefulUserName(ball.runRequest.command.args[1]);

					if (user !== null) {
						const chatEffect = userRemovedFromQueueEffect(ball, queue, user);
						effects.push(
							persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
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
							persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
							persistUsersToFileEffect(ball, ball.runRequest.parameters.next, nextUp),
							...usersInListEffects(ball, nextUp, `Next ${nextCount} in queue`, "Also")
						);
					}
					break;
				}
			}

			return effects;
		}
	}
};

export default actions;
