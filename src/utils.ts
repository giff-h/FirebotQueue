import { BallOfPower } from "./firebot.model";

function isValidQueue(queue: unknown): queue is string[] {
	if (Array.isArray(queue)) {
		queue.forEach(e => {
			if (typeof e !== "string") {
				return false;
			}
		});
		return true;
	}
	return false;
}

export function fetchSender(ball: BallOfPower): string {
	return ball.runRequest.command.commandSender.toLowerCase();
}

export function isString(x: unknown): x is string {
	return typeof x === "string";
}

export function loadQueue(ball: BallOfPower): string[] {
	const queue = JSON.parse(ball.runRequest.modules.fs.readFileSync(ball.runRequest.parameters.queue, "utf-8"));

	if (isValidQueue(queue)) {
		return queue;
	} else {
		throw new Error("Invalid queue file structure");
	}
}

export function hopefulUserName(raw: any): string | null {
	if (isString(raw)) {
		raw = raw.trim().toLowerCase();
		return raw.startsWith("@") ? raw.substring(1) : raw;
	} else {
		return null;
	}
}
