"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.getDefaultParameters = void 0;
var Utils;
(function (Utils) {
    /**
     * Check if something is a string. Mostly exists for the typing.
     * @param x Can be anything
     */
    function isString(x) {
        return typeof x === "string";
    }
    Utils.isString = isString;
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
     * @returns The username of who invoked the command
     */
    function fetchSender(ball) {
        return ball.runRequest.command.commandSender;
    }
    Utils.fetchSender = fetchSender;
    /**
     * Load the queue from wherever it's stored. If there's any problem with this, an error is raised
     * and handled elsewhere so the proper effects can happen
     * @param ball All of Firebot's given data
     * @returns The fabled queue
     */
    function loadQueue(ball) {
        const queue = JSON.parse(ball.runRequest.modules.fs.readFileSync(ball.runRequest.parameters.queue, "utf-8"));
        if (isValidQueue(queue)) {
            return queue;
        }
        else {
            throw new Error("Invalid queue file structure");
        }
    }
    Utils.loadQueue = loadQueue;
    /**
     * Parse a username from a given value. If the value isn't a string, returns `null`
     * @param raw The value that should be a username
     * @returns The username without leading `@`, or `null`
     */
    function hopefulUserName(raw) {
        if (isString(raw)) {
            raw = raw.trim();
            return raw.startsWith("@") ? raw.substring(1) : raw;
        }
        else {
            return null;
        }
    }
    Utils.hopefulUserName = hopefulUserName;
    /**
     * Performs a case insensitive index search for a user in the queue
     * @param queue The fabled queue
     * @param user The user to find in the queue
     */
    function userIndexInQueue(queue, user) {
        return queue.map(u => u.toUpperCase()).indexOf(user.toUpperCase());
    }
    Utils.userIndexInQueue = userIndexInQueue;
})(Utils || (Utils = {}));
var Effects;
(function (Effects) {
    /**
     * If the user is in the queue, does nothing, and returns the appropriate chat effect.
     * If the user is not in the queue, adds, and returns the appropriate chat effect.
     * @param ball All of Firebot's given data
     * @param queue The fabled queue
     * @param user The user to add to the queue
     * @returns The effect to return to Firebot
     */
    function userAddedToQueueEffect(ball, queue, user) {
        const effect = {
            type: ball.effectType.CHAT,
            message: ""
        }, userIndex = Utils.userIndexInQueue(queue, user);
        if (userIndex === -1) {
            queue.push(user);
            effect.message = `${user} added to the queue at position ${queue.length}`;
        }
        else {
            effect.message = `${queue[userIndex]} is already in the queue at position ${userIndex + 1}`;
        }
        return effect;
    }
    Effects.userAddedToQueueEffect = userAddedToQueueEffect;
    /**
     * If the user is in the queue, removes, and returns the appropriate chat effect.
     * If the user is not in the queue, does nothing, and returns the appropriate chat effect.
     * @param ball All of Firebot's given data
     * @param queue The fabled queue
     * @param user The user to remove from the queue
     * @returns The effect to return to Firebot
     */
    function userRemovedFromQueueEffect(ball, queue, user) {
        const effect = {
            type: ball.effectType.CHAT,
            message: ""
        }, userIndex = Utils.userIndexInQueue(queue, user);
        if (userIndex === -1) {
            effect.message = `${user} wasn't in the queue`;
        }
        else {
            effect.message = `${queue.splice(userIndex, 1)[0]} is no longer in the queue`;
        }
        return effect;
    }
    Effects.userRemovedFromQueueEffect = userRemovedFromQueueEffect;
    /**
     * Reports all the users in the array as chat messages, comma-separated. Since the size of this list is unbound, it can be many messages.
     * @param ball All of Firebot's given data
     * @param users The array of users to report
     * @param initialPrefix The part of the first message before the users. Result: `"<initialPrefix>: user1, user2, user3"`
     * @param subsequentPrefix The part of the additional messages before the users. Result: `"<subsequentPrefix>: user82, user83, user84"`
     * @returns The effects to return to Firebot
     */
    function usersInListEffects(ball, users, initialPrefix, subsequentPrefix) {
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
    Effects.usersInListEffects = usersInListEffects;
    /**
     * Creates the effect to write a list of users to a file.
     * @param ball All of Firebot's given data
     * @param filepath The path of the file to be written
     * @param users The array of users to save
     * @returns The effect to return to Firebot
     */
    function persistUsersToFileEffect(ball, filepath, users) {
        return {
            type: ball.effectType.TEXT_TO_FILE,
            filepath,
            writeMode: "replace",
            text: JSON.stringify(users)
        };
    }
    Effects.persistUsersToFileEffect = persistUsersToFileEffect;
    /**
     * Creates the effects to restore the queue in the event of a problem.
     * @param ball All of Firebot's given data
     * @param options Any extra data to alter the effect
     * @returns The effects to return to Firebot
     */
    function restoreQueueEffects(ball, options) {
        const user = options === null || options === void 0 ? void 0 : options.user, userGiven = Utils.isString(user), queue = userGiven ? [user] : [];
        return [
            persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
            {
                type: ball.effectType.CHAT,
                message: "There was a problem with the queue, it is now " + (userGiven ? `just ${user}` : "empty")
            }
        ];
    }
    Effects.restoreQueueEffects = restoreQueueEffects;
})(Effects || (Effects = {}));
var Actions;
(function (Actions) {
    /**
     * The object that contains the command and argument dispatch actions
     */
    Actions.actions = {
        "!join": {
            effects: function (ball, queue) {
                // These effects are built in this order on purpose, because the queue mutates.
                const sender = Utils.fetchSender(ball), chatEffect = Effects.userAddedToQueueEffect(ball, queue, sender);
                return [
                    Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
                    chatEffect
                ];
            },
            restore: function (ball) {
                return {
                    user: Utils.fetchSender(ball)
                };
            }
        },
        "!leave": {
            effects: function (ball, queue) {
                // These effects are built in this order on purpose, because the queue mutates.
                const sender = Utils.fetchSender(ball), chatEffect = Effects.userRemovedFromQueueEffect(ball, queue, sender);
                return [
                    Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
                    chatEffect
                ];
            }
        },
        "!rejoin": {
            effects: function (ball, queue) {
                // These effects are built in this order on purpose, because the queue mutates.
                const sender = Utils.fetchSender(ball), leaveEffect = Effects.userRemovedFromQueueEffect(ball, queue, sender), joinEffect = Effects.userAddedToQueueEffect(ball, queue, sender);
                return [
                    Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue),
                    leaveEffect,
                    joinEffect
                ];
            },
            restore: function (ball) {
                return {
                    user: Utils.fetchSender(ball)
                };
            }
        },
        "!queue": {
            effects: function (ball, queue) {
                const verb = ball.runRequest.command.args[0].trim().toLowerCase(), effects = [];
                switch (verb) {
                    case "remove": {
                        const user = Utils.hopefulUserName(ball.runRequest.command.args[1]);
                        if (user !== null) {
                            // These effects are built in this order on purpose, because the queue mutates.
                            const chatEffect = Effects.userRemovedFromQueueEffect(ball, queue, user);
                            effects.push(Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue), chatEffect);
                        }
                        break;
                    }
                    case "next": {
                        const nextCount = Number(ball.runRequest.command.args[1].trim());
                        if (!isNaN(nextCount)) {
                            const nextUp = queue.splice(0, nextCount);
                            effects.push(Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.queue, queue), Effects.persistUsersToFileEffect(ball, ball.runRequest.parameters.next, nextUp), ...Effects.usersInListEffects(ball, nextUp, `Next ${nextCount} in queue`, "Also"));
                        }
                        break;
                    }
                    default: {
                        ball.runRequest.modules.logger.warn("!queue verb not handled: " + verb);
                    }
                }
                return effects;
            }
        }
    };
})(Actions || (Actions = {}));
/**
 * The main dispatch of the script.
 * @param ball All of Firebot's given data
 * @returns The effects to return to Firebot
 */
function handle(ball) {
    const trigger = ball.runRequest.command.trigger;
    let effects = [];
    if (trigger in Actions.actions) {
        ball.runRequest.modules.logger.debug("Acting on the trigger: " + trigger);
        const action = Actions.actions[trigger];
        let queue = [], isQueueValid = true;
        try {
            queue = Utils.loadQueue(ball);
        }
        catch (_a) {
            isQueueValid = false;
        }
        if (isQueueValid) {
            effects = action.effects(ball, queue);
        }
        else {
            if ("restore" in action) {
                effects = Effects.restoreQueueEffects(ball, action.restore(ball));
            }
            else {
                effects = Effects.restoreQueueEffects(ball);
            }
        }
    }
    else {
        ball.runRequest.modules.logger.warn("The expected trigger was not actionable: " + trigger);
    }
    return effects;
}
/**
 * Firebot script parameters function
 */
function getDefaultParameters() {
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
exports.getDefaultParameters = getDefaultParameters;
/**
 * Firebot script run function
 * @param runRequest The data about the script run, provided by Firebot
 */
function run(runRequest) {
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
exports.run = run;
