import { isString, userIndexInQueue } from "./utils";
/**
 * If the user is in the queue, does nothing, and returns the appropriate chat effect.
 * If the user is not in the queue, adds, and returns the appropriate chat effect.
 * @param ball All of Firebot's given data
 * @param queue The fabled queue
 * @param user The user to add to the queue
 * @returns The effect to return to Firebot
 */
export function userAddedToQueueEffect(ball, queue, user) {
    const effect = {
        type: ball.effectType.CHAT,
        message: ""
    }, userIndex = userIndexInQueue(queue, user);
    if (userIndex === -1) {
        queue.push(user);
        effect.message = `${user} added to the queue at position ${queue.length}`;
    }
    else {
        effect.message = `${queue[userIndex]} is already in the queue at position ${userIndex}`;
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
export function userRemovedFromQueueEffect(ball, queue, user) {
    const effect = {
        type: ball.effectType.CHAT,
        message: ""
    }, userIndex = userIndexInQueue(queue, user);
    if (userIndex === -1) {
        effect.message = `${user} wasn't in the queue`;
    }
    else {
        effect.message = `${queue.splice(userIndex, 1)[0]} is no longer in the queue`;
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
export function usersInListEffects(ball, users, initialPrefix, subsequentPrefix) {
    const effects = [];
    if (users.length === 0) {
        return effects;
    }
    let message = `${initialPrefix}: ${users.splice(0, 1)[0]}`, tempMessage = message;
    while (users.length > 0) {
        tempMessage += `, ${users[0]}`;
        if (tempMessage.length > 500) {
            // `tempMessage` is overfull, `message` is as big as it can be, but we have more users to report
            effects.push({
                type: ball.effectType.CHAT,
                message
            });
            tempMessage = message = `${subsequentPrefix}: ${users.splice(0, 1)[0]}`;
        }
        else {
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
 * Creates the effect to write a list of users to a file.
 * @param ball All of Firebot's given data
 * @param filepath The path of the file to be written
 * @param users The array of users to save
 * @returns The effect to return to Firebot
 */
export function persistUsersToFileEffect(ball, filepath, users) {
    return {
        type: ball.effectType.TEXT_TO_FILE,
        filepath,
        writeMode: "replace",
        text: JSON.stringify(users)
    };
}
/**
 * Creates the effects to restore the queue in the event of a problem.
 * @param ball All of Firebot's given data
 * @param options Any extra data to alter the effect
 * @returns The effects to return to Firebot
 */
export function restoreQueueEffects(ball, options) {
    const user = options === null || options === void 0 ? void 0 : options.user, userGiven = isString(user), queue = userGiven ? [user] : [];
    return [
        persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
        {
            type: ball.effectType.CHAT,
            message: "There was a problem with the queue, it is now " + (userGiven ? `just ${user}` : "empty")
        }
    ];
}
