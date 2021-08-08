import { ScriptModules } from "firebot-custom-scripts-types";
import { Effects } from "firebot-custom-scripts-types/types/effects";
import { caseInsensitiveIndexInArray, deepCopy, isStringArray } from "./utils";

type Queue = string[];

type Queues<P extends string> = Record<P, Queue>;

/**
 * Structure that describes the result of adding a user to the queue
 */
export interface UserAddResult {
    /**
     * The user as it was added or possibly found
     *
     * If it was found, the casing will match how it existed
     */
    user: string;

    /**
     * The index of the user after being added or found
     */
    index: number;

    /**
     * true if the user was added, false if the user was found
     */
    added: boolean;
}

/**
 * Structure that describes the result of removing a user from the queue
 */
export interface UserRemoveResult {
    /**
     * The user as it was possibly found
     *
     * If it was found, the casing will match how it existed
     */
    user: string;

    /**
     * true if the user was removed, false if the user was not in the queue
     */
    removed: boolean;
}

/**
 * Structure that describes the contents of the queue file on disk
 */
export interface QueueFile<P extends string, E extends {}> {
    /**
     * The user queues
     */
    queues: Queues<P>;

    /**
     * Any extra data you need to track queue state
     */
    extras: E;
}

/**
 * Base class of your queue manager. The `fs` constructor argument should come from `runRequest.modules.fs`
 */
export abstract class UserQueueManager<TQueueName extends string, TQueueExtras extends {} = {}> {
    readonly queueCache: Record<string, QueueFile<TQueueName, TQueueExtras>> = {};

    private readonly _fileDefaults: QueueFile<TQueueName, TQueueExtras>;

    private readonly _fs: Pick<ScriptModules["fs"], "readJsonSync">;

    /**
     * @param fileDefaults The data to use in case the contents of the file are incorrect
     * @param fs Use `runRequest.modules.fs` for this
     */
    constructor(fileDefaults: QueueFile<TQueueName, TQueueExtras>, fs: ScriptModules["fs"]) {
        this._fileDefaults = deepCopy(fileDefaults);
        this._fs = fs;
    }

    /**
     * Cleans the extra data from the file, in case it's needed
     *
     * Assume nothing about the values, they could be anything from the file. The expected
     * keys from the file defaults will all be there
     *
     * @param extras The extra data from the queue file
     *
     * @returns The cleaned extra data
     */
    abstract cleanExtras(extras: Record<keyof TQueueExtras, unknown>): TQueueExtras;

    /**
     * Load the given file from disk and populate the queue cache with the cleaned data
     *
     * @param filepath The path to the file on disk
     */
    loadData(filepath: string): void {
        if (filepath in this.queueCache) {
            return;
        }

        let data = this._fs.readJsonSync(filepath, { throws: false });
        let queues: Queues<TQueueName>;
        let extras: TQueueExtras;

        if (typeof data !== "object" || data === null) {
            // Everything is wrong, set to default and move on
            queues = deepCopy(this._fileDefaults.queues);
            extras = deepCopy(this._fileDefaults.extras);
        } else {
            if (typeof data.queues !== "object" || data.queues === null) {
                // Queues are all wrong, set to default and move on
                queues = deepCopy(this._fileDefaults.queues);
            } else {
                queues = Object.entries(this._fileDefaults.queues).reduce(
                    (result, [key, value]) => ({ ...result, [key]: isStringArray(data.queues[key]) ? data.queues[key] : deepCopy(value) }),
                    {} as Queues<TQueueName>,
                );
            }
            if (typeof data.extras !== "object" || data.extras === null) {
                // Extras are all wrong, set to default and move on
                extras = deepCopy(this._fileDefaults.extras);
            } else {
                extras = Object.entries(this._fileDefaults.extras).reduce(
                    (result, [key, value]) => ({ ...result, [key]: key in data.extras ? data.extras[key] : value }),
                    {} as TQueueExtras,
                );
            }
        }

        this.queueCache[filepath] = { queues, extras: this.cleanExtras(extras) };
    }

    /**
     * Creates a Firebot effect to write the current contents of the queue to the file
     *
     * @param filepath The disk path of interest
     * @returns The effect to return to Firebot
     */
    writeQueueEffect(filepath: string): Effects.Effect {
        return {
            type: "firebot:filewriter",
            filepath,
            writeMode: "replace",
            text: JSON.stringify(this.queueCache[filepath]),
        };
    }

    /**
     * Gets the list of users by name
     *
     * Modifying this result in place will not affect the queue
     *
     * @param filepath The disk path of interest
     * @param queueName The name of the queue to get
     * @returns
     */
    getQueue(filepath: string, queueName: TQueueName): Queue {
        this.loadData(filepath);
        return deepCopy(this.queueCache[filepath].queues[queueName]);
    }

    /**
     * Sets a queue by name as the given list
     *
     * @param filepath The disk path of interest
     * @param queueName The name of the queue to set
     * @param queue The list of users for the queue
     */
    setQueue(filepath: string, queueName: TQueueName, queue: Queue): void {
        this.loadData(filepath);
        this.queueCache[filepath].queues[queueName] = deepCopy(queue);
    }

    /**
     * Gets an extra data by name
     *
     * Modifying this result in place will not affect the queue
     *
     * @param filepath The disk path of interest
     * @param key The name of the extra to get
     * @returns The value of the extra
     */
    getExtra<K extends keyof TQueueExtras>(filepath: string, key: K): TQueueExtras[K] {
        this.loadData(filepath);
        return deepCopy(this.queueCache[filepath].extras[key]);
    }

    /**
     * Sets an extra data by name as the given value
     *
     * @param filepath The disk path of interest
     * @param key The name of the extra to set
     * @param value The value of the extra to set
     */
    setExtra<K extends keyof TQueueExtras>(filepath: string, key: K, value: TQueueExtras[K]): void {
        this.loadData(filepath);
        const extras = { ...this.queueCache[filepath].extras, [key]: value };
        this.queueCache[filepath].extras = deepCopy(this.cleanExtras(extras));
    }

    /**
     * Adds a user to the start of a queue
     *
     * If the user was found by case insensitive search, they are not added again
     *
     * @param filepath The disk path of interest
     * @param queueName The name of the queue to which the user is added
     * @param user The user to add
     * @returns The result of adding the user
     */
    addUserToQueueStart(filepath: string, queueName: TQueueName, user: string): UserAddResult {
        const queue = this.getQueue(filepath, queueName);
        let index = caseInsensitiveIndexInArray(queue, user);
        const notInQueue = index === -1;

        if (notInQueue) {
            index = 0;
            queue.splice(0, 0, user);
            this.setQueue(filepath, queueName, queue);
        } else {
            user = queue[index];
        }

        return { user, index, added: notInQueue };
    }

    /**
     * Adds a user to the end of a queue
     *
     * If the user was found by case insensitive search, they are not added again
     *
     * @param filepath The disk path of interest
     * @param queueName The name of the queue to which the user is added
     * @param user The user to add
     * @returns The result of adding the user
     */
    addUserToQueueEnd(filepath: string, queueName: TQueueName, user: string): UserAddResult {
        const queue = this.getQueue(filepath, queueName);
        let index = caseInsensitiveIndexInArray(queue, user);
        const notInQueue = index === -1;

        if (notInQueue) {
            index = queue.length;
            queue.push(user);
            this.setQueue(filepath, queueName, queue);
        } else {
            user = queue[index];
        }

        return { user, index, added: notInQueue };
    }

    /**
     * Takes the users of the source queue and puts them at the start of the target queue in the same order
     *
     * If any users in the source queue were found in the target queue by case insensitive search,
     * the original target queue position is maintained, and they are not added again
     *
     * @param filepath The disk path of interest
     * @param targetQueueName The queue to which the users are added
     * @param sourceQueueName The queue from which the users are sourced
     */
    mergeSourceQueueToTargetQueueStart(filepath: string, targetQueueName: TQueueName, sourceQueueName: TQueueName): void {
        const targetQueue = this.getQueue(filepath, targetQueueName);
        const sourceQueue = this.getQueue(filepath, sourceQueueName);

        targetQueue.splice(0, 0, ...sourceQueue.filter((user) => caseInsensitiveIndexInArray(targetQueue, user) === -1));
        this.setQueue(filepath, targetQueueName, targetQueue);
        this.setQueue(filepath, sourceQueueName, []);
    }

    /**
     * Takes the users of the source queue and puts them at the end of the target queue in the same order
     *
     * If any users in the source queue were found in the target queue by case insensitive search,
     * the original target queue position is maintained, and they are not added again
     *
     * @param filepath The disk path of interest
     * @param targetQueueName The queue to which the users are added
     * @param sourceQueueName The queue from which the users are sourced
     */
    mergeSourceQueueToTargetQueueEnd(filepath: string, targetQueueName: TQueueName, sourceQueueName: TQueueName): void {
        const targetQueue = this.getQueue(filepath, targetQueueName);
        const sourceQueue = this.getQueue(filepath, sourceQueueName);

        targetQueue.push(...sourceQueue.filter((user) => caseInsensitiveIndexInArray(targetQueue, user) === -1));
        this.setQueue(filepath, targetQueueName, targetQueue);
        this.setQueue(filepath, sourceQueueName, []);
    }

    /**
     * Removes a user from the named queue
     *
     * If the user was not found, nothing happens
     *
     * @param filepath The disk path of interest
     * @param queueName The queue from which the user is removed
     * @param user The user to remove
     * @returns The result of removing the user
     */
    removeUserFromQueue(filepath: string, queueName: TQueueName, user: string): UserRemoveResult {
        const queue = this.getQueue(filepath, queueName);
        const index = caseInsensitiveIndexInArray(queue, user);
        const wasInQueue = index !== -1;

        if (wasInQueue) {
            user = queue.splice(index, 1)[0];
            this.setQueue(filepath, queueName, queue);
        }

        return {
            user,
            removed: wasInQueue,
        };
    }

    /**
     * Removes and returns some users from the start of the named queue
     *
     * If the amount exceeds the length of the queue, no extra users are grabbed from elsewhere
     *
     * @param filepath The disk path of interest
     * @param queueName The queue from which the users are removed
     * @param amount The amount of users to remove
     * @returns The users who were removed
     */
    removeAmountOfUsersFromQueueStart(filepath: string, queueName: TQueueName, amount: number): Queue {
        const queue = this.getQueue(filepath, queueName);
        const removed = queue.splice(0, amount);
        this.setQueue(filepath, queueName, queue);
        return removed;
    }

    /**
     * Removes and returns some users from the end of the named queue
     *
     * If the amount exceeds the length of the queue, no extra users are grabbed from elsewhere
     *
     * @param filepath The disk path of interest
     * @param queueName The queue from which the users are removed
     * @param amount The amount of users to remove
     * @returns The users who were removed
     */
    removeAmountOfUsersFromQueueEnd(filepath: string, queueName: TQueueName, amount: number): Queue {
        const queue = this.getQueue(filepath, queueName);
        const removed = queue.splice(queue.length - amount, amount);
        this.setQueue(filepath, queueName, queue);
        return removed;
    }
}
