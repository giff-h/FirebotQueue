import { Effects } from "firebot-custom-scripts-types/types/effects";
import { UserQueueManager } from "./user-queue-manager";
import { appendToStringFromArrayUntilFull, caseInsensitiveIndexInArray } from "./utils";

/**
 * The names of the games queues
 */
export type GamesQueueNames = "main" | "next" | "skip";

/**
 * The state of the games queues
 */
export interface GamesQueueExtras {
    /**
     * Used to indicate if the queue is enabled
     */
    enabled: boolean;
}

/**
 * The parameters for the main firebot custom script config
 */
export interface Params {
    /**
     * The path of the queue file
     */
    queue: string;
}

/**
 * Report a list of users in chat, comma separated, split into multiple messages
 * if it surpasses the max length of 500 characters
 *
 * @param users The list of users to report
 * @param predicate The first part of the first message
 * @returns A list of chat effects to return to Firebot
 */
export function reportUsersInChat(users: string[], predicate: string): Effects.Effect[] {
    const effects: Effects.Effect[] = [];
    const [message, remainder] = appendToStringFromArrayUntilFull(predicate, users, 500, ", ");

    effects.push({ type: "firebot:chat", message });
    while (remainder.length) {
        const [newMessage, newRemainder] = appendToStringFromArrayUntilFull("Also: ", remainder, 500, ", ");
        effects.push({ type: "firebot:chat", message: newMessage });
        remainder.splice(0, remainder.length, ...newRemainder);
    }

    return effects;
}

/**
 * A queue manager for games
 *
 * Users can be added, removed, shifted in and out of the current game, and skipped from the current game
 *
 * The queue can also be disabled, what this means is up to you
 */
export class GamesQueue extends UserQueueManager<GamesQueueNames, GamesQueueExtras> {
    /**
     * Cleans the state
     */
    cleanExtras(extras: Record<keyof GamesQueueExtras, unknown>): GamesQueueExtras {
        return { enabled: !!extras.enabled };
    }

    /**
     * Adds a user to the end of the main queue if they aren't already in
     *
     * Leaves them in if they're already in
     *
     * Returned effects save the file and report in chat their position and whether they were added
     *
     * @param filepath The path of the queue file
     * @param user The user to add
     * @returns The effects to return to Firebot
     */
    add(filepath: string, user: string): Effects.Effect[] {
        const effects: Effects.Effect[] = [];
        const fullQueue = [...this.getQueue(filepath, "skip"), ...this.getQueue(filepath, "main")];
        const userPosition = caseInsensitiveIndexInArray(fullQueue, user);

        if (userPosition === -1) {
            this.addUserToQueueEnd(filepath, "main", user);
            effects.push(this.writeQueueEffect(filepath), {
                type: "firebot:chat",
                message: `${user} added to the queue at position ${fullQueue.length + 1}`,
            });
        } else {
            effects.push({
                type: "firebot:chat",
                message: `${fullQueue[userPosition]} is already in the queue at position ${userPosition + 1}`,
            });
        }

        return effects;
    }

    /**
     * Removes a user from the main or skip queues if they were in either one
     *
     * Returned effects save the file and report in chat whether they were removed
     *
     * @param filepath The path of the queue file
     * @param user The user to remove
     * @returns The effects to return to Firebot
     */
    remove(filepath: string, user: string): Effects.Effect[] {
        const effects: Effects.Effect[] = [];
        const skipResult = this.removeUserFromQueue(filepath, "skip", user);
        const mainResult = this.removeUserFromQueue(filepath, "main", user);
        user = skipResult.removed ? skipResult.user : mainResult.removed ? mainResult.user : user;

        if (skipResult.removed || mainResult.removed) {
            effects.push(this.writeQueueEffect(filepath), {
                type: "firebot:chat",
                message: `${user} is no longer in the queue`,
            });
        } else {
            effects.push({ type: "firebot:chat", message: `${user} wasn't in the queue` });
        }

        return effects;
    }

    /**
     * Removes a user from the main or skip queues if they were in either one and adds them back
     * to the end of the main queue
     *
     * Returned effects save the file and report in chat their new position
     *
     * @param filepath The path of the queue file
     * @param user The user to move
     * @returns The effects to return to Firebot
     */
    moveToBack(filepath: string, user: string): Effects.Effect[] {
        const skipResult = this.removeUserFromQueue(filepath, "skip", user);
        const mainResult = this.removeUserFromQueue(filepath, "main", user);
        user = skipResult.removed ? skipResult.user : mainResult.removed ? mainResult.user : user;
        this.addUserToQueueEnd(filepath, "main", user);
        const userPosition = this.getQueue(filepath, "skip").length + this.getQueue(filepath, "main").length;

        return [
            this.writeQueueEffect(filepath),
            { type: "firebot:chat", message: `${user} is now in the queue at position ${userPosition}` },
        ];
    }

    /**
     * Moves a user from the next queue to the end of the skip queue
     *
     * Does nothing if they weren't in the next queue
     *
     * Returned effects save the file and report in chat whether they were skipped and the new next queue if they were skipped
     *
     * @param filepath The path of the queue file
     * @param user The user to skip
     * @returns The effects to return to Firebot
     */
    skip(filepath: string, user: string): Effects.Effect[] {
        const effects: Effects.Effect[] = [];
        const result = this.removeUserFromQueue(filepath, "next", user);

        if (result.removed) {
            user = result.user;
            this.removeUserFromQueue(filepath, "main", user);
            this.addUserToQueueEnd(filepath, "skip", user);
            const newUser = this.removeAmountOfUsersFromQueueStart(filepath, "main", 1)[0];
            if (newUser) {
                this.addUserToQueueEnd(filepath, "next", newUser);
            }
            const predicate = `Skipping ${user}. `;
            effects.push(this.writeQueueEffect(filepath), ...this._reportNextQueue(filepath, predicate));
        } else {
            effects.push({ type: "firebot:chat", message: `${user} wasn't up next` });
        }

        return effects;
    }

    /**
     * Lists the users in the skip and main queues in chat
     *
     * @param filepath The path of the queue file
     * @returns The effects to return to Firebot
     */
    list(filepath: string): Effects.Effect[] {
        const users = [...this.getQueue(filepath, "skip"), ...this.getQueue(filepath, "main")];
        const predicate = `${users.length} ${users.length === 1 ? "user" : "users"} in the queue: `;

        return reportUsersInChat(users, predicate);
    }

    /**
     * Wipes the next queue and moves an amount of users from the skip queue then the main queue
     *
     * If there was no one to move, the next queue is still wiped
     *
     * Returned effects save the file and report in chat the size and contents of the next queue
     *
     * @param filepath The path of the queue file
     * @param amount The amount of users to move
     * @returns The effects to return to Firebot
     */
    prepareNext(filepath: string, amount: number): Effects.Effect[] {
        this.mergeSourceQueueToTargetQueueStart(filepath, "main", "skip");
        const users = this.getQueue(filepath, "main");
        const next = users.splice(0, amount);

        this.setQueue(filepath, "main", users);
        this.setQueue(filepath, "next", next);
        return [this.writeQueueEffect(filepath), ...this._reportNextQueue(filepath)];
    }

    /**
     * Removes a user from the next queue and pulls one user from the main queue to replace them
     *
     * Does nothing if the user wasn't in the next queue
     *
     * Returned effects save the file and report in chat the removed user and the new next queue
     *
     * @param filepath The path of the queue file
     * @param user The user to replace
     * @returns The effects to return to Firebot
     */
    replace(filepath: string, user: string): Effects.Effect[] {
        const effects: Effects.Effect[] = [];
        const removeResult = this.removeUserFromQueue(filepath, "next", user);

        if (removeResult.removed) {
            const replaceUser = this.removeAmountOfUsersFromQueueStart(filepath, "main", 1)[0];
            if (replaceUser !== undefined) {
                this.addUserToQueueEnd(filepath, "next", replaceUser);
            }
            const predicate = `${removeResult.user} is no longer in the queue. `;
            effects.push(this.writeQueueEffect(filepath), ...this._reportNextQueue(filepath, predicate));
        } else {
            effects.push({ type: "firebot:chat", message: `${user} wasn't up next` });
        }

        return effects;
    }

    /**
     * Moves one user from the skip or main queue to the next queue
     *
     * Does nothing if they weren't in the queue
     *
     * Returned effects save the file and report in chat whether they were shifted or weren't in the queue
     *
     * @param filepath The path of the queue file
     * @param user The user to move
     * @returns The effects to return to Firebot
     */
    shiftUserToNext(filepath: string, user: string): Effects.Effect[] {
        const effects: Effects.Effect[] = [];
        const skipResult = this.removeUserFromQueue(filepath, "skip", user);
        const mainResult = this.removeUserFromQueue(filepath, "main", user);
        user = skipResult.removed ? skipResult.user : mainResult.removed ? mainResult.user : user;

        if (skipResult.removed || mainResult.removed) {
            this.addUserToQueueEnd(filepath, "next", user);
            effects.push(this.writeQueueEffect(filepath), { type: "firebot:chat", message: `${user} is also up next` });
        } else {
            effects.push({ type: "firebot:chat", message: `${user} wasn't in the queue` });
        }

        return effects;
    }

    /**
     * Moves some users from the main queue to the next queue
     *
     * Returned effects save the file and report in chat the new next queue
     *
     * @param filepath The path of the queue file
     * @param amount The amount to shift
     * @returns The effects to return to Firebot
     */
    shiftSomeToNext(filepath: string, amount: number): Effects.Effect[] {
        const users = this.removeAmountOfUsersFromQueueStart(filepath, "main", amount);
        for (const user of users) {
            this.addUserToQueueEnd(filepath, "next", user);
        }
        return [this.writeQueueEffect(filepath), ...this._reportNextQueue(filepath)];
    }

    /**
     * Moves one user from the next queue to the start of the main queue
     *
     * Does nothing if they weren't in the queue
     *
     * Returned effects save the file and report in chat whether they were shifted and their new position if they were shifted
     *
     * @param filepath The path of the queue file
     * @param user The user to move
     * @returns The effects to return to Firebot
     */
    unshiftUserFromNext(filepath: string, user: string): Effects.Effect[] {
        const effects: Effects.Effect[] = [];
        const removeResult = this.removeUserFromQueue(filepath, "next", user);

        if (removeResult.removed) {
            user = removeResult.user;
            this.removeUserFromQueue(filepath, "main", user);
            const addResult = this.addUserToQueueStart(filepath, "main", user);
            const skipLength = this.getQueue(filepath, "skip").length;
            effects.push(this.writeQueueEffect(filepath), {
                type: "firebot:chat",
                message: `${user} is back in queue at position ${skipLength + addResult.index + 1}`,
            });
        } else {
            effects.push({ type: "firebot:chat", message: `${user} wasn't up next` });
        }

        return effects;
    }

    /**
     * Moves some users from the next queue to the main queue
     *
     * Returned effects save the file and report in chat the size of the next queue
     *
     * @param filepath The path of the queue file
     * @param amount The amount to shift
     * @returns The effects to return to Firebot
     */
    unshiftSomeFromNext(filepath: string, amount: number): Effects.Effect[] {
        const users = this.removeAmountOfUsersFromQueueEnd(filepath, "next", amount).reverse();
        for (const user of users) {
            this.removeUserFromQueue(filepath, "main", user);
            this.addUserToQueueStart(filepath, "main", user);
        }
        const nextLength = this.getQueue(filepath, "next").length;
        const singular = nextLength === 1;
        return [
            this.writeQueueEffect(filepath),
            { type: "firebot:chat", message: `There ${singular ? "is" : "are"} now ${nextLength} ${singular ? "user" : "users"} up next` },
        ];
    }

    /**
     * Sets the enabled state of the queue
     *
     * Returned effects save the file and report in chat the new enabled state of the queue
     *
     * @param filepath The path of the queue file
     * @param state The new enabled state
     * @returns The effects to return to Firebot
     */
    setEnabled(filepath: string, state: boolean): Effects.Effect[] {
        this.setExtra(filepath, "enabled", state);
        return [this.writeQueueEffect(filepath), { type: "firebot:chat", message: `The queue is now ${state ? "on" : "off"}` }];
    }

    /**
     * Gets whether the queue is enabled
     *
     * @param filepath The path of the queue file
     * @returns The current enabled state
     */
    isEnabled(filepath: string): boolean {
        return this.getExtra(filepath, "enabled");
    }

    /**
     * Reports the size and contents of the next queue
     *
     * @param filepath The path of the queue file
     * @param predicate Optional text to include before the report. If provided, must include its own whitespace at the end
     * @returns The effects to return to Firebot
     */
    private _reportNextQueue(filepath: string, predicate = ""): Effects.Effect[] {
        const next = this.getQueue(filepath, "next");
        return next.length
            ? reportUsersInChat(next, predicate + `Next ${next.length} in queue: `)
            : [{ type: "firebot:chat", message: predicate + "No one up next" }];
    }
}
