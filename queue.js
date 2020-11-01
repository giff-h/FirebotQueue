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
     * Check if the value is a valid number that can be used to manipulate the queues.
     * @param x The value to check
     */
    function isUsableNumber(x) {
        return !isNaN(x) && Number.isInteger(x) && x > 0;
    }
    Utils.isUsableNumber = isUsableNumber;
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
    Utils.isValidQueue = isValidQueue;
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
     * @param users The fabled queue
     * @param user The user to find in the queue
     */
    function userIndexInArray(users, user) {
        return users.map(u => u.toUpperCase()).indexOf(user.toUpperCase());
    }
    Utils.userIndexInArray = userIndexInArray;
    /**
     * Build the structure of the chat message effect.
     * @param message An optional message for rapid construction, defaults to an empty string.
     * @returns The chat effect to return to Firebot
     */
    function chatMessageEffect(message = "") {
        return {
            type: EffectType.CHAT,
            message: message
        };
    }
    Utils.chatMessageEffect = chatMessageEffect;
})(Utils || (Utils = {}));
class QueueManager {
    constructor(runRequest) {
        this.queueCache = {};
        this.runRequest = runRequest;
    }
    logDebug(message) {
        this.runRequest.modules.logger.debug(message);
    }
    logInfo(message) {
        this.runRequest.modules.logger.info(message);
    }
    logWarn(message) {
        this.runRequest.modules.logger.warn(message);
    }
    /**
     * If the main queue was loaded, and not changed, use this to prevent it from being unnecessarily rewritten.
     */
    uncacheQueue() {
        delete this.queueCache[this.runRequest.parameters.queue];
    }
    /**
     * If the next-up queue was loaded, and not changed, use this to prevent it from being unnecessarily rewritten.
     */
    uncacheNext() {
        delete this.queueCache[this.runRequest.parameters.next];
    }
    /**
     * Build the Firebot effects to populate the queues from the cache to their respective files.
     * @returns The effects to return to Firebot
     */
    persistEffects() {
        const effects = [];
        for (let filepath in this.queueCache) {
            effects.push({
                type: EffectType.TEXT_TO_FILE,
                filepath,
                writeMode: "replace",
                text: JSON.stringify(this.queueCache[filepath])
            });
        }
        return effects;
    }
    /**
     * Load the given file, parse the data, and default to the given `default_data` if there's any problem, or the data is invalid.
     * If the data is parsed successfully, `validator` is called to verify its authenticity.
     * The final result is cached by the filepath in case it's accessed multiple times while handling a command.
     * @param filepath The path of the file to be read
     * @param default_data The value to use in the event of any problem
     * @param validator The function to validate the data, might receive any valid JSON.parse result
     */
    loadDataFromFile(filepath, default_data, validator) {
        if (filepath in this.queueCache) {
            return this.queueCache[filepath];
        }
        else {
            let data = default_data;
            try {
                data = JSON.parse(this.runRequest.modules.fs.readFileSync(filepath, "utf-8"));
            }
            catch (_a) {
                this.logWarn("There was an error reading from the file");
            }
            if (!validator(data)) {
                this.logWarn("The file structure was not correct");
                data = default_data;
            }
            this.queueCache[filepath] = data;
            return data;
        }
    }
    /**
     * The main queue
     */
    get queue() {
        const default_data = [], validator = (data) => Utils.isValidQueue(data);
        return this.loadDataFromFile(this.runRequest.parameters.queue, default_data, validator);
    }
    /**
     * The next-up queue
     */
    get next() {
        const default_data = { queue: [], code: "" }, validator = (data) => {
            if (typeof data !== "object" || !Utils.isValidQueue(data.queue)) {
                return false;
            }
            else if (!Utils.isString(data.code)) {
                data.code = "";
            }
            return true;
        };
        return this.loadDataFromFile(this.runRequest.parameters.next, default_data, validator);
    }
    /**
     * The user who sent the command
     */
    get sender() {
        return this.runRequest.command.commandSender;
    }
    /**
     * The main trigger of the command
     */
    get trigger() {
        return this.runRequest.command.trigger;
    }
    /**
     * Load the n-th word after the command invoke. This is zero-indexed.
     * E.g. "!queue [0]next [1]7"
     * @param n The argument position
     * @returns The argument value
     */
    commandArgument(n) {
        return this.runRequest.command.args[n];
    }
    /**
     * Report the users in the list in chat. The message(s) will be the following format:
     * "[predicate]: user1, user2, user3, ..."
     * "Also: user52, user53, ..."
     * This is aware of the chat message size limit of 500 characters, and splits the report across multiple messages if necessary.
     * This is destructive to the given list, so send a copy if necessary.
     * @param users The list of users to report
     * @param predicate What to say before listing the users
     */
    reportUsersInListEffects(users, predicate) {
        if (users.length === 0) {
            return [];
        }
        const effects = [];
        let message = `${predicate}: ${users.splice(0, 1)[0]}`, tempMessage = message;
        while (users.length > 0) {
            tempMessage += `, ${users[0]}`;
            if (tempMessage.length > 500) {
                // `tempMessage` is overfull, `message` is as big as it can be, but we have more users to report
                effects.push(Utils.chatMessageEffect(message));
                tempMessage = message = `Also: ${users.splice(0, 1)[0]}`;
            }
            else {
                message = tempMessage;
                users.splice(0, 1);
            }
        }
        // No more people, add the last chat message
        effects.push(Utils.chatMessageEffect(message));
        return effects;
    }
    /**
     * Add the given user to the main queue, and report the position in chat.
     * If the user is already in the queue, nothing happens, but the position is still reported.
     * The case of the user does not matter, but will persist if it was not found.
     * @param user The user to add to the main queue
     * @returns The chat effect to return to Firebot
     */
    addUserToQueueEffect(user) {
        const queue = this.queue, effect = Utils.chatMessageEffect(), userIndex = Utils.userIndexInArray(queue, user);
        if (userIndex === -1) {
            queue.push(user);
            effect.message = `${user} added to the queue at position ${queue.length}`;
        }
        else {
            user = queue[userIndex];
            effect.message = `${user} is already in the queue at position ${userIndex + 1}`;
            this.uncacheQueue();
        }
        return effect;
    }
    /**
     * Remove the given user from the main queue, and report in chat.
     * If the user is not in the queue, nothing happens, and the absence is reported.
     * The case of the user does not matter.
     * @param user The user to remove from the main queue
     * @returns The chat effect to return to Firebot
     */
    removeUserFromQueueEffect(user) {
        const queue = this.queue, effect = Utils.chatMessageEffect(), userIndex = Utils.userIndexInArray(queue, user);
        if (userIndex === -1) {
            effect.message = `${user} wasn't in the queue`;
            this.uncacheQueue();
        }
        else {
            user = queue.splice(userIndex, 1)[0];
            effect.message = `${user} is no longer in the queue`;
        }
        return effect;
    }
    /**
     * Remove the given user from the main queue, re-add at the end, and report the position in chat.
     * If the user is not in the queue, it's added anyway.
     * The case of the user does not matter, but it will persist if it was not found.
     * @param user The user to reposition in the main queue
     * @returns The chat effect to return to Firebot
     */
    resetUserInQueueEffect(user) {
        const queue = this.queue, userIndex = Utils.userIndexInArray(queue, user);
        if (userIndex !== -1) {
            user = queue.splice(userIndex, 1)[0];
        }
        queue.push(user);
        return Utils.chatMessageEffect(`${user} is now at the end of the queue at position ${queue.length}`);
    }
    /**
     * Take some users from the front of the main queue, put them in the next-up queue, and report the next-up queue in chat.
     * If the count is not a positive integer, nothing happens, and nothing is reported.
     * @param count The number of users to move
     * @returns The chat effects to return to Firebot
     */
    shiftSomeUsersToNextEffects(count) {
        if (!Utils.isUsableNumber(count)) {
            return [];
        }
        const queue = this.queue, next = this.next.queue, effects = [];
        next.push(...queue.splice(0, count));
        const users = Object.assign([], next);
        return this.reportUsersInListEffects(users, `Next ${users.length} in queue`);
    }
    /**
     * Take one user from the main queue, put them in the next-up queue, and report in chat.
     * If the user is not in the queue, nothing happens, and the absence is reported.
     * @param user The user to move
     * @returns The chat effect to return to Firebot
     */
    shiftOneUserToNextEffects(user) {
        const queue = this.queue, effect = Utils.chatMessageEffect(), userIndex = Utils.userIndexInArray(queue, user);
        if (userIndex === -1) {
            effect.message = `${user} wasn't in the queue`;
            this.uncacheQueue();
        }
        else {
            const next = this.next.queue;
            user = queue.splice(userIndex, 1)[0];
            next.push(user);
            effect.message = `${user} is also up next`;
        }
        return effect;
    }
    /**
     * Take some users from the end of the next-up queue, put them at the front of the main queue, and report the next-up size in chat.
     * If the count is not a positive integer, nothing happens, and an appropriate message is reported.
     * @param count The number of users to move
     * @returns The chat effect to return to Firebot
     */
    unshiftSomeUsersFromNextEffect(count) {
        if (!Utils.isUsableNumber(count)) {
            return Utils.chatMessageEffect("That's an unusable number");
        }
        const queue = this.queue, next = this.next.queue, initialQueueLength = queue.length;
        if (count > next.length) {
            count = next.length;
        }
        queue.unshift(...next.splice(next.length - count, count).filter(user => Utils.userIndexInArray(queue, user) === -1));
        if (queue.length === initialQueueLength) {
            this.uncacheQueue();
        }
        return Utils.chatMessageEffect(`There ${next.length === 1 ? "is" : "are"} now ${next.length} ${next.length === 1 ? "user" : "users"} next up`);
    }
    /**
     * Take one user from the next-up queue, put them at the front of the main queue, and report in chat.
     * If the user is not in the queue, nothing happens, and the absence is reported.
     * @param user The user to move
     * @returns The chat effect to return to Firebot
     */
    unshiftOneUserFromNextEffect(user) {
        const queue = this.queue, next = this.next.queue, effect = Utils.chatMessageEffect(), queueIndex = Utils.userIndexInArray(queue, user), nextIndex = Utils.userIndexInArray(next, user);
        if (nextIndex === -1) {
            effect.message = `${user} wasn't up next`;
            this.uncacheNext();
            this.uncacheQueue();
        }
        else if (queueIndex !== -1) {
            user = queue[queueIndex];
            next.splice(nextIndex, 1);
            effect.message = `${user} is back in the queue at position ${queueIndex + 1}`;
            this.uncacheQueue();
        }
        else {
            user = next.splice(nextIndex, 1)[0];
            queue.unshift(user);
            effect.message = `${user} is now at the front of the queue`;
        }
        return effect;
    }
}
/**
 * The object that contains the command and argument dispatch actions
 */
const actions = {
    "!join": (manager) => {
        const chatEffect = manager.addUserToQueueEffect(manager.sender);
        return [...manager.persistEffects(), chatEffect];
    },
    "!leave": (manager) => {
        const chatEffect = manager.removeUserFromQueueEffect(manager.sender);
        return [...manager.persistEffects(), chatEffect];
    },
    "!rejoin": (manager) => {
        const chatEffect = manager.resetUserInQueueEffect(manager.sender);
        return [...manager.persistEffects(), chatEffect];
    },
    "!queue": (manager) => {
        const verb = manager.commandArgument(0), effects = [];
        if (Utils.isString(verb)) {
            switch (verb.trim().toLowerCase()) {
                case "list": {
                    const users = Object.assign([], manager.queue), singular = users.length === 1, predicate = `${users.length} ${singular ? "user" : "users"} in the queue`;
                    manager.uncacheQueue();
                    effects.push(...manager.reportUsersInListEffects(users, predicate));
                }
                case "next": {
                    const nextArg = manager.commandArgument(1);
                    if (Utils.isString(nextArg)) {
                        const nextCount = Number(nextArg.trim());
                        if (Utils.isUsableNumber(nextCount)) {
                            manager.next.queue = [];
                            const chatEffects = manager.shiftSomeUsersToNextEffects(nextCount);
                            effects.push(...manager.persistEffects());
                            effects.push(...chatEffects);
                        }
                    }
                    break;
                }
                case "remove": {
                    const user = Utils.hopefulUserName(manager.commandArgument(1));
                    if (user !== null) {
                        const chatEffect = manager.removeUserFromQueueEffect(user);
                        effects.push(...manager.persistEffects());
                        effects.push(chatEffect);
                    }
                    break;
                }
                case "shift": {
                    const shiftArg = manager.commandArgument(1);
                    if (Utils.isString(shiftArg)) {
                        const shiftCount = Number(shiftArg.trim());
                        if (isNaN(shiftCount)) {
                            const user = Utils.hopefulUserName(shiftArg);
                            if (user !== null) {
                                const chatEffect = manager.shiftOneUserToNextEffects(user);
                                effects.push(...manager.persistEffects());
                                effects.push(chatEffect);
                            }
                        }
                        else {
                            const chatEffects = manager.shiftSomeUsersToNextEffects(shiftCount);
                            effects.push(...manager.persistEffects());
                            effects.push(...chatEffects);
                        }
                    }
                    break;
                }
                case "unshift": {
                    const unshiftArg = manager.commandArgument(1);
                    if (Utils.isString(unshiftArg)) {
                        const unshiftCount = Number(unshiftArg.trim());
                        if (isNaN(unshiftCount)) {
                            const user = Utils.hopefulUserName(unshiftArg);
                            if (user !== null) {
                                const chatEffect = manager.unshiftOneUserFromNextEffect(user);
                                effects.push(...manager.persistEffects());
                                effects.push(chatEffect);
                            }
                        }
                        else {
                            const chatEffect = manager.unshiftSomeUsersFromNextEffect(unshiftCount);
                            effects.push(...manager.persistEffects());
                            effects.push(chatEffect);
                        }
                    }
                    break;
                }
                default: {
                    manager.logWarn("!queue verb not handled: " + verb);
                    break;
                }
            }
        }
        return effects;
    }
};
/**
 * The main dispatch of the script.
 * @param runRequest The data given by Firebot
 * @returns The effects to return to Firebot
 */
function handle(runRequest) {
    const manager = new QueueManager(runRequest), trigger = manager.trigger;
    let effects = [];
    if (trigger in actions) {
        manager.logDebug("Acting on the trigger: " + trigger);
        effects.push(...actions[trigger](manager));
    }
    else {
        manager.logWarn("The expected trigger was not actionable: " + trigger);
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
                description: "The .json file that contains the main queue"
            },
            next: {
                type: "filepath",
                description: "The .json file that contains the next-up queue"
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
    const result = {
        success: true,
        effects: []
    };
    try {
        result.effects = handle(runRequest);
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
