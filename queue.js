/* Firebot givens */
define("firebot.model", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("utils", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hopefulUserName = exports.loadQueue = exports.fetchSender = exports.isString = void 0;
    /**
     * Check if something is a string. Mostly exists for the typing.
     * @param x Can be anything
     */
    function isString(x) {
        return typeof x === "string";
    }
    exports.isString = isString;
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
    function fetchSender(ball) {
        return ball.runRequest.command.commandSender.toLowerCase();
    }
    exports.fetchSender = fetchSender;
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
    exports.loadQueue = loadQueue;
    /**
     * Parse a username from a given value. If the value isn't a string, returns `null`
     * @param raw The value that should be a username
     * @returns The lowercase username without leading `@`, or `null`
     */
    function hopefulUserName(raw) {
        if (isString(raw)) {
            raw = raw.trim().toLowerCase();
            return raw.startsWith("@") ? raw.substring(1) : raw;
        }
        else {
            return null;
        }
    }
    exports.hopefulUserName = hopefulUserName;
});
define("effects", ["require", "exports", "utils"], function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.restoreQueueEffects = exports.persistQueueEffect = exports.usersInListEffects = exports.userRemovedFromQueueEffect = exports.userAddedToQueueEffect = void 0;
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
        }, userIndex = queue.indexOf(user);
        if (userIndex === -1) {
            queue.push(user);
            effect.message = `${user} added to the queue at position ${queue.length}`;
        }
        else {
            effect.message = `${user} is already in the queue at position ${userIndex}`;
        }
        return effect;
    }
    exports.userAddedToQueueEffect = userAddedToQueueEffect;
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
        }, userIndex = queue.indexOf(user);
        if (userIndex === -1) {
            effect.message = `${user} wasn't in the queue`;
        }
        else {
            queue.splice(userIndex, 1);
            effect.message = `${user} is no longer in the queue`;
        }
        return effect;
    }
    exports.userRemovedFromQueueEffect = userRemovedFromQueueEffect;
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
    exports.usersInListEffects = usersInListEffects;
    /**
     * Creates the effect to save the queue.
     * @param ball All of Firebot's given data
     * @param queue The fabled queue
     * @returns The effect to return to Firebot
     */
    function persistQueueEffect(ball, queue) {
        return {
            type: ball.effectType.TEXT_TO_FILE,
            filepath: ball.runRequest.parameters.queue,
            writeMode: "replace",
            text: JSON.stringify(queue)
        };
    }
    exports.persistQueueEffect = persistQueueEffect;
    /**
     * Creates the effects to restore the queue in the event of a problem.
     * @param ball All of Firebot's given data
     * @param options Any extra data to alter the effect
     * @returns The effects to return to Firebot
     */
    function restoreQueueEffects(ball, options) {
        const user = options === null || options === void 0 ? void 0 : options.user, userGiven = utils_1.isString(user), queue = userGiven ? [user] : [];
        return [
            persistQueueEffect(ball, queue),
            {
                type: ball.effectType.CHAT,
                message: "There was a problem with the queue, it is now " + (userGiven ? `just ${user}` : "empty")
            }
        ];
    }
    exports.restoreQueueEffects = restoreQueueEffects;
});
define("actions", ["require", "exports", "effects", "utils"], function (require, exports, effects_1, utils_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * The object that contains the command and argument dispatch actions
     */
    const actions = {
        "!join": {
            effects: function (ball, queue) {
                const sender = utils_2.fetchSender(ball), chatEffect = effects_1.userAddedToQueueEffect(ball, queue, sender);
                return [
                    effects_1.persistQueueEffect(ball, queue),
                    chatEffect
                ];
            },
            restore: function (ball) {
                return {
                    user: utils_2.fetchSender(ball)
                };
            }
        },
        "!leave": {
            effects: function (ball, queue) {
                const sender = utils_2.fetchSender(ball), chatEffect = effects_1.userRemovedFromQueueEffect(ball, queue, sender);
                return [
                    effects_1.persistQueueEffect(ball, queue),
                    chatEffect
                ];
            }
        },
        "!queue": {
            effects: function (ball, queue) {
                const verb = ball.runRequest.command.args[0].trim().toLowerCase(), effects = [];
                switch (verb) {
                    case "remove": {
                        const user = utils_2.hopefulUserName(ball.runRequest.command.args[1]);
                        if (user !== null) {
                            const chatEffect = effects_1.userRemovedFromQueueEffect(ball, queue, user);
                            effects.push(effects_1.persistQueueEffect(ball, queue), chatEffect);
                        }
                        break;
                    }
                    case "next": {
                        const nextCount = Number(ball.runRequest.command.args[1].trim());
                        if (!isNaN(nextCount)) {
                            const nextUp = queue.splice(0, nextCount);
                            effects.push(effects_1.persistQueueEffect(ball, queue), ...effects_1.usersInListEffects(ball, nextUp, `Next ${nextCount} in queue`, "Also"));
                        }
                        break;
                    }
                }
                return effects;
            }
        }
    };
    exports.default = actions;
});
define("queue", ["require", "exports", "actions", "effects", "utils"], function (require, exports, actions_1, effects_2, utils_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.run = exports.getDefaultParameters = void 0;
    /**
     * The main dispatch of the script.
     * @param ball All of Firebot's given data
     * @returns The effects to return to Firebot
     */
    function handle(ball) {
        const trigger = ball.runRequest.command.trigger;
        let effects = [];
        if (trigger in actions_1.default) {
            const action = actions_1.default[trigger];
            let queue = [], isQueueValid = true;
            try {
                queue = utils_3.loadQueue(ball);
            }
            catch (_a) {
                isQueueValid = false;
            }
            if (isQueueValid) {
                effects = action.effects(ball, queue);
            }
            else {
                if ("restore" in action) {
                    effects = effects_2.restoreQueueEffects(ball, action.restore(ball));
                }
                else {
                    effects = effects_2.restoreQueueEffects(ball);
                }
            }
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
});
