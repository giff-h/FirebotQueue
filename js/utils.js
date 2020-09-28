/**
 * Check if something is a string. Mostly exists for the typing.
 * @param x Can be anything
 */
export function isString(x) {
    return typeof x === "string";
}
/**
 * Check if something is an array of strings, which is the required queue structure.
 * @param hopefulQueue Can be anything
 */
function isValidQueue(hopefulQueue) {
    if (Array.isArray(hopefulQueue)) {
        for (let i = 0; i < hopefulQueue.length; i++) {
            if (!isString(hopefulQueue[i])) {
                return false;
            }
        }
        return true;
    }
    return false;
}
/**
 * Look up the name of the user from Firebot data
 * @param ball All of Firebot's given data
 * @returns The lowercase name of the user who invoked the command
 */
export function fetchSender(ball) {
    return ball.runRequest.command.commandSender.toLowerCase();
}
/**
 * Load the queue from wherever it's stored. If there's any problem with this, an error is raised
 * and handled elsewhere so the proper effects can happen
 * @param ball All of Firebot's given data
 * @returns The fabled queue
 */
export function loadQueue(ball) {
    const queue = JSON.parse(ball.runRequest.modules.fs.readFileSync(ball.runRequest.parameters.queue, "utf-8"));
    if (isValidQueue(queue)) {
        return queue;
    }
    else {
        throw new Error("Invalid queue file structure");
    }
}
/**
 * Parse a username from a given value. If the value isn't a string, returns `null`
 * @param raw The value that should be a username
 * @returns The lowercase username without leading `@`, or `null`
 */
export function hopefulUserName(raw) {
    if (isString(raw)) {
        raw = raw.trim().toLowerCase();
        return raw.startsWith("@") ? raw.substring(1) : raw;
    }
    else {
        return null;
    }
}
