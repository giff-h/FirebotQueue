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
        user = user.toUpperCase();
        for (let i = 0; i < users.length; i++) {
            if (users[i].toUpperCase() === user) {
                return i;
            }
        }
        return -1;
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
    static get defaultQueue() {
        return {
            mainQueue: [],
            nextUpQueue: [],
            skippedQueue: [],
            enabled: false,
            code: ""
        };
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
     * If the file was loaded, and not changed, use this to prevent it from being unnecessarily rewritten.
     */
    uncacheData() {
        delete this.queueCache[this.runRequest.parameters.queue];
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
    loadQueue() {
        const filepath = this.runRequest.parameters.queue;
        if (filepath in this.queueCache) {
            return this.queueCache[filepath];
        }
        else {
            const defaultData = QueueManager.defaultQueue;
            let data = defaultData;
            try {
                data = JSON.parse(this.runRequest.modules.fs.readFileSync(filepath, "utf-8"));
            }
            catch (_a) {
                this.logWarn("There was an error reading from the file");
            }
            if (typeof data !== "object" || Array.isArray(data) || data === null) {
                data = defaultData;
            }
            if (!(Object.prototype.hasOwnProperty.call(data, "mainQueue") && Utils.isValidQueue(data.mainQueue))) {
                data.mainQueue = defaultData.mainQueue;
            }
            if (!(Object.prototype.hasOwnProperty.call(data, "nextUpQueue") && Utils.isValidQueue(data.nextUpQueue))) {
                data.nextUpQueue = defaultData.nextUpQueue;
            }
            if (!(Object.prototype.hasOwnProperty.call(data, "skippedQueue") && Utils.isValidQueue(data.skippedQueue))) {
                data.skippedQueue = defaultData.skippedQueue;
            }
            if (!(Object.prototype.hasOwnProperty.call(data, "code") && Utils.isString(data.code))) {
                data.code = defaultData.code;
            }
            if (Object.prototype.hasOwnProperty.call(data, "enabled")) {
                data.enabled = !!data.enabled; // double-negating forces to a boolean while maintaining "truthiness", 0 "" null and undefined are falsy values
            }
            else {
                data.enabled = defaultData.enabled;
            }
            this.queueCache[filepath] = data;
            return data;
        }
    }
    /**
     * The main queue
     */
    get mainQueue() {
        return this.loadQueue().mainQueue;
    }
    /**
     * The next-up queue
     */
    get nextUpQueue() {
        return this.loadQueue().nextUpQueue;
    }
    /**
     * The queue of users who chose to skip
     */
    get skippedQueue() {
        return this.loadQueue().skippedQueue;
    }
    get isEnabled() {
        return this.loadQueue().enabled;
    }
    set enabled(enabled) {
        const data = this.loadQueue();
        data.enabled = enabled;
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
        const effect = Utils.chatMessageEffect(), queue = this.mainQueue, skip = this.skippedQueue, fullQueue = [...skip, ...queue], userIndex = Utils.userIndexInArray(fullQueue, user);
        if (userIndex !== -1) {
            user = fullQueue[userIndex];
            effect.message = `${user} is already in the queue at position ${userIndex + 1}`;
            this.uncacheData();
        }
        else {
            queue.push(user);
            effect.message = `${user} added to the queue at position ${skip.length + queue.length}`;
        }
        return effect;
    }
    /**
     * Remove the given user from the skipped priority queue or the main queue, and report in chat.
     * If the user is not in the queue, nothing happens, and the absence is reported.
     * The case of the user does not matter.
     * @param user The user to remove from the main queue
     * @returns The chat effect to return to Firebot
     */
    removeUserFromQueueEffect(user) {
        const effect = Utils.chatMessageEffect(), queue = this.mainQueue, skip = this.skippedQueue, queueIndex = Utils.userIndexInArray(queue, user), skipIndex = Utils.userIndexInArray(skip, user);
        if (queueIndex === -1 && skipIndex === -1) {
            effect.message = `${user} wasn't in the queue`;
            this.uncacheData();
        }
        else {
            user = skipIndex === -1 ? queue.splice(queueIndex, 1)[0] : skip.splice(skipIndex, 1)[0];
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
        const queue = this.mainQueue, skip = this.skippedQueue, queueIndex = Utils.userIndexInArray(queue, user), skipIndex = Utils.userIndexInArray(skip, user);
        user = skipIndex === -1 ? queue.splice(queueIndex, 1)[0] : skip.splice(skipIndex, 1)[0];
        queue.push(user);
        return Utils.chatMessageEffect(`${user} is now at the end of the queue at position ${queue.length}`);
    }
    /**
     * Take some users from the front of the skipped priority queue then the main queue, put them in the next-up queue, and report the next-up queue in chat.
     * If `skippedFirst` is false, the skipped priority queue is not used.
     * If the count is not a positive integer, nothing happens, and nothing is reported.
     * @param count The number of users to move
     * @param skippedFirst Look in the skipped priority queue first
     * @returns The chat effects to return to Firebot
     */
    shiftSomeUsersToNextEffects(count, skippedFirst = true) {
        if (!Utils.isUsableNumber(count)) {
            return [];
        }
        let usersShifted = 0;
        const next = this.nextUpQueue, initialLength = next.length;
        if (skippedFirst) {
            const skip = this.skippedQueue;
            if (skip.length !== 0) {
                next.push(...skip.splice(0, count).filter(user => Utils.userIndexInArray(next, user) === -1));
                usersShifted = next.length - initialLength;
            }
        }
        if (usersShifted < count) {
            const queue = this.mainQueue;
            next.push(...queue.splice(0, count - usersShifted).filter(user => Utils.userIndexInArray(next, user) === -1));
        }
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
        const effect = Utils.chatMessageEffect(), queue = this.mainQueue, skip = this.skippedQueue, queueIndex = Utils.userIndexInArray(queue, user), skipIndex = Utils.userIndexInArray(skip, user);
        if (skipIndex === -1 && queueIndex === -1) {
            effect.message = `${user} wasn't in a queue`;
            this.uncacheData();
        }
        else {
            const next = this.nextUpQueue;
            user = skipIndex === -1 ? queue.splice(queueIndex, 1)[0] : skip.splice(skipIndex, 1)[0];
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
        const queue = this.mainQueue, next = this.nextUpQueue;
        if (count > next.length) {
            count = next.length;
        }
        queue.unshift(...next.splice(next.length - count, count).filter(user => Utils.userIndexInArray(queue, user) === -1));
        return Utils.chatMessageEffect(`There ${next.length === 1 ? "is" : "are"} now ${next.length} ${next.length === 1 ? "user" : "users"} next up`);
    }
    /**
     * Take one user from the next-up queue, put them at the front of the main queue, and report in chat.
     * If the user is not in the queue, nothing happens, and the absence is reported.
     * @param user The user to move
     * @returns The chat effect to return to Firebot
     */
    unshiftOneUserFromNextEffect(user) {
        const effect = Utils.chatMessageEffect(), queue = this.mainQueue, next = this.nextUpQueue, queueIndex = Utils.userIndexInArray(queue, user), nextIndex = Utils.userIndexInArray(next, user);
        if (nextIndex === -1) {
            effect.message = `${user} wasn't up next`;
            this.uncacheData();
        }
        else if (queueIndex !== -1) {
            user = queue[queueIndex];
            next.splice(nextIndex, 1);
            effect.message = `${user} is back in the queue at position ${queueIndex + 1}`;
        }
        else {
            user = next.splice(nextIndex, 1)[0];
            queue.unshift(user);
            effect.message = `${user} is now at the front of the queue`;
        }
        return effect;
    }
    /**
     * Take one user from the next-up queue, put them at the end of the skipped priority queue, shift one user from the main queue to replace, and report in chat.
     * If the user is not in the queue, nothing happens, and the absence is reported.
     * @param user The user to skip
     * @returns The chat effects to return to Firebot
     */
    skipUser(user) {
        const effects = [], next = this.nextUpQueue, skip = this.skippedQueue, nextIndex = Utils.userIndexInArray(next, user);
        if (nextIndex === -1) {
            effects.push(Utils.chatMessageEffect(`${user} wasn't up next`));
            this.uncacheData();
        }
        else {
            user = next.splice(nextIndex, 1)[0];
            skip.push(user);
            effects.push(Utils.chatMessageEffect(`Skipping ${user}`));
            effects.push(...this.shiftSomeUsersToNextEffects(1, false));
        }
        return effects;
    }
}
/**
 * The object that contains the command and argument dispatch actions
 */
const actions = {
    "!join": (manager) => {
        if (!manager.isEnabled)
            return [];
        const chatEffect = manager.addUserToQueueEffect(manager.sender);
        return [...manager.persistEffects(), chatEffect];
    },
    "!leave": (manager) => {
        const chatEffect = manager.removeUserFromQueueEffect(manager.sender);
        return [...manager.persistEffects(), chatEffect];
    },
    "!rejoin": (manager) => {
        if (!manager.isEnabled)
            return [];
        const chatEffect = manager.resetUserInQueueEffect(manager.sender);
        return [...manager.persistEffects(), chatEffect];
    },
    "!skip": (manager) => {
        const chatEffects = manager.skipUser(manager.sender);
        return [...manager.persistEffects(), ...chatEffects];
    },
    "!queue": (manager) => {
        const verb = manager.commandArgument(0), effects = [];
        if (Utils.isString(verb)) {
            switch (verb.trim().toLowerCase()) {
                case "list": {
                    const users = Object.assign([], manager.mainQueue), singular = users.length === 1, predicate = `${users.length} ${singular ? "user" : "users"} in the queue`;
                    manager.uncacheData();
                    effects.push(...manager.reportUsersInListEffects(users, predicate));
                }
                case "next": {
                    const nextArg = manager.commandArgument(1);
                    if (Utils.isString(nextArg)) {
                        const nextCount = Number(nextArg.trim());
                        if (Utils.isUsableNumber(nextCount)) {
                            manager.nextUpQueue.splice(0);
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
                case "replace": {
                    const user = Utils.hopefulUserName(manager.commandArgument(1));
                    if (user !== null) {
                        if (Utils.userIndexInArray(manager.nextUpQueue, user) === -1) {
                            effects.push(manager.unshiftOneUserFromNextEffect(user));
                        }
                        else {
                            manager.unshiftOneUserFromNextEffect(user);
                            effects.push(manager.removeUserFromQueueEffect(user));
                            effects.push(...manager.shiftSomeUsersToNextEffects(1, false));
                            effects.unshift(...manager.persistEffects());
                        }
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
                            const chatEffects = manager.shiftSomeUsersToNextEffects(shiftCount, false);
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
                case "on": {
                    const chatEffect = Utils.chatMessageEffect();
                    if (manager.enabled) {
                        manager.uncacheData();
                        chatEffect.message = "The queue was on";
                    }
                    else {
                        manager.enabled = true;
                        effects.push(...manager.persistEffects());
                        chatEffect.message = "The queue is on";
                    }
                    effects.push(chatEffect);
                    break;
                }
                case "off": {
                    const chatEffect = Utils.chatMessageEffect();
                    if (manager.enabled) {
                        manager.enabled = false;
                        effects.push(...manager.persistEffects());
                        chatEffect.message = "The queue is off";
                    }
                    else {
                        manager.uncacheData();
                        chatEffect.message = "The queue was off";
                    }
                    effects.push(chatEffect);
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
                description: "The .json file that holds the data."
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
