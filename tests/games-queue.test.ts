import { ScriptModules } from "firebot-custom-scripts-types";
import { GamesQueue, GamesQueueExtras, GamesQueueNames, reportUsersInChat } from "../src/games-queue";
import { QueueFile } from "../src/user-queue-manager";

describe("reportUsersInChat", () => {
    it("returns the users in the list", () => {
        const actual = reportUsersInChat(["one", "two", "buckle", "my", "shoe"], "Sing along! ");
        expect(actual).toHaveLength(1);
        expect(actual[0]).toMatchObject({ message: "Sing along! one, two, buckle, my, shoe" });
    });

    it("overflows at 500 characters", () => {
        const users = new Array(500).fill(0).map((_, index) => index.toString());
        const actual = reportUsersInChat(users, "Lots of numbers: ");
        expect(actual).toHaveLength(5);
        expect(actual[0].message).toMatch(/, 118$/);
        expect(actual[1].message).toMatch(/^Also: 119, /);
        expect(actual[4].message).toMatch(/, 499$/);
    });
});

describe("GamesQueue", () => {
    let defaultValue: QueueFile<GamesQueueNames, GamesQueueExtras>;
    let manager: GamesQueue;
    const readJsonSync = jest.fn(
        (..._args: jest.ArgsType<ScriptModules["fs"]["readJsonSync"]>): ReturnType<ScriptModules["fs"]["readJsonSync"]> => null,
    );
    const filepath = "foo.json";

    beforeEach(() => {
        defaultValue = {
            queues: { main: ["One", "Two", "Three"], next: ["Four", "Five", "Six"], skip: ["Seven", "Eight", "Nine"] },
            extras: { enabled: true },
        };
        manager = new GamesQueue(defaultValue, { readJsonSync } as unknown as ScriptModules["fs"]);
    });

    describe("cleanExtras", () => {
        it.each`
            enabled
            ${true}
            ${false}
        `("maintains valid state", ({ enabled }) => {
            const expected = { enabled };
            const actual = manager.cleanExtras(expected);
            expect(actual).toEqual(expected);
        });

        it.each`
            expected | enabled
            ${true}  | ${"invalid"}
            ${true}  | ${42}
            ${false} | ${null}
            ${false} | ${undefined}
        `("cleans invalid state", ({ expected, enabled }) => {
            const actual = manager.cleanExtras({ enabled });
            expect(actual).toEqual({ enabled: expected });
        });
    });

    describe("add", () => {
        it("adds the user to the main queue", () => {
            const newUser = "newUser";
            const result = manager.add(filepath, newUser);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: `${newUser} added to the queue at position 7` });
            const expected = [...defaultValue.queues.main, newUser];
            const actual = manager.getQueue(filepath, "main");
            expect(actual).toEqual(expected);
        });

        it.each`
            queue
            ${"main"}
            ${"skip"}
        `("doesn't add the user if they are already in the $queue queue", ({ queue }: { queue: GamesQueueNames }) => {
            const user = defaultValue.queues[queue][0];
            const result = manager.add(filepath, user);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: `${user} is already in the queue at position ${queue === "skip" ? 1 : 4}` });
            const actual = manager.getQueue(filepath, queue);
            expect(actual).toEqual(defaultValue.queues[queue]);
        });

        it("allows adding users in the next queue", () => {
            const newUser = "Six";
            const result = manager.add(filepath, newUser);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: `${newUser} added to the queue at position 7` });
            const expected = [...defaultValue.queues.main, newUser];
            const actual = manager.getQueue(filepath, "main");
            expect(actual).toEqual(expected);
        });

        it("leaves other queues untouched", () => {
            const newUser = "newUser";
            const expected = { ...defaultValue.queues, main: [...defaultValue.queues.main, newUser] };
            manager.add(filepath, newUser);
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });
    });

    describe("remove", () => {
        it.each`
            queue
            ${"main"}
            ${"skip"}
        `("removes the user from the $queue queue", ({ queue }: { queue: GamesQueueNames }) => {
            const user = defaultValue.queues[queue][0];
            const result = manager.remove(filepath, user);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: `${user} is no longer in the queue` });
            const actual = manager.getQueue(filepath, queue);
            expect(actual).toEqual(defaultValue.queues[queue].slice(1));
        });

        it("doesn't remove from the next queue", () => {
            const result = manager.remove(filepath, "four");
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: "four wasn't in the queue" });
            const actual = manager.getQueue(filepath, "next");
            expect(actual).toEqual(defaultValue.queues.next);
        });

        it.each`
            queue
            ${"main"}
            ${"skip"}
        `("leaves the next queue untouched when removing from $queue queue", ({ queue }: { queue: GamesQueueNames }) => {
            const user = defaultValue.queues[queue][0];
            const expected = { ...defaultValue.queues, [queue]: defaultValue.queues[queue].slice(1) };
            manager.remove(filepath, user);
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });
    });

    describe("moveToBack", () => {
        it("moves the user to the back of the main queue", () => {
            const result = manager.moveToBack(filepath, "two");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Two is now in the queue at position 6" });
            const actual = manager.getQueue(filepath, "main");
            expect(actual).toEqual(["One", "Three", "Two"]);
        });

        it("moves the user from the skip queue", () => {
            const result = manager.moveToBack(filepath, "seven");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Seven is now in the queue at position 6" });
            const main = manager.getQueue(filepath, "main");
            expect(main).toEqual([...defaultValue.queues.main, "Seven"]);
            const skip = manager.getQueue(filepath, "skip");
            expect(skip).toEqual(["Eight", "Nine"]);
        });

        it("does not remove the user from the next queue", () => {
            const result = manager.moveToBack(filepath, "six");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "six is now in the queue at position 7" });
            const expected = { ...defaultValue.queues, main: [...defaultValue.queues.main, "six"] };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("leaves other queues untouched", () => {
            const expected = { ...defaultValue.queues, main: ["Two", "Three", "One"] };
            manager.moveToBack(filepath, "one");
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });
    });

    describe("skip", () => {
        it("moves the user from the next queue to the skip queue and pulls one from main", () => {
            const result = manager.skip(filepath, "six");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Skipping Six. Next 3 in queue: Four, Five, One" });
            const main = manager.getQueue(filepath, "main");
            expect(main).toEqual(["Two", "Three"]);
            const skip = manager.getQueue(filepath, "skip");
            expect(skip).toEqual([...defaultValue.queues.skip, "Six"]);
            const next = manager.getQueue(filepath, "next");
            expect(next).toEqual(["Four", "Five", "One"]);
        });

        it("removes the user from main if they had joined after getting in the next queue", () => {
            manager.addUserToQueueEnd(filepath, "main", "five");
            const result = manager.skip(filepath, "five");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Skipping Five. Next 3 in queue: Four, Six, One" });
            const main = manager.getQueue(filepath, "main");
            expect(main).toEqual(["Two", "Three"]);
            const skip = manager.getQueue(filepath, "skip");
            expect(skip).toEqual([...defaultValue.queues.skip, "Five"]);
            const next = manager.getQueue(filepath, "next");
            expect(next).toEqual(["Four", "Six", "One"]);
        });

        it.each`
            queue
            ${"main"}
            ${"skip"}
        `("doesn't remove the user from the $queue queue", ({ queue }: { queue: GamesQueueNames }) => {
            const user = defaultValue.queues[queue][0];
            const result = manager.skip(filepath, user);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: `${user} wasn't up next` });
        });

        it("reports an empty queue if no one could be pulled", () => {
            manager.setQueue(filepath, "main", []);
            manager.setQueue(filepath, "next", ["Only"]);
            const result = manager.skip(filepath, "only");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Skipping Only. No one up next" });
        });
    });

    describe("list", () => {
        it("lists the users in the main and skip queue", () => {
            const result = manager.list(filepath);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: "6 users in the queue: Seven, Eight, Nine, One, Two, Three" });
        });

        it("lists singular correctly", () => {
            manager.setQueue(filepath, "skip", []);
            manager.setQueue(filepath, "main", ["One"]);
            const result = manager.list(filepath);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: "1 user in the queue: One" });
        });
    });

    describe("prepareNext", () => {
        it("wipes next and puts an amount of users in next", () => {
            const result = manager.prepareNext(filepath, 2);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Next 2 in queue: Seven, Eight" });
            const next = manager.getQueue(filepath, "next");
            expect(next).toEqual(["Seven", "Eight"]);
            const skip = manager.getQueue(filepath, "skip");
            expect(skip).toEqual([]);
            const main = manager.getQueue(filepath, "main");
            expect(main).toEqual(["Nine", ...defaultValue.queues.main]);
        });

        it("pulls from the skip queue first then main for overflow", () => {
            const result = manager.prepareNext(filepath, 100);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Next 6 in queue: Seven, Eight, Nine, One, Two, Three" });
            const next = manager.getQueue(filepath, "next");
            expect(next).toEqual([...defaultValue.queues.skip, ...defaultValue.queues.main]);
            const skip = manager.getQueue(filepath, "skip");
            expect(skip).toEqual([]);
            const main = manager.getQueue(filepath, "main");
            expect(main).toEqual([]);
        });

        it("reports an empty queue if no one could be pulled", () => {
            manager.setQueue(filepath, "skip", []);
            manager.setQueue(filepath, "main", []);
            const result = manager.prepareNext(filepath, 1);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "No one up next" });
        });
    });

    describe("replace", () => {
        it("pulls the user from the next queue and replaces them with the first in the main queue", () => {
            const result = manager.replace(filepath, "four");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Four is no longer in the queue. Next 3 in queue: Five, Six, One" });
            const next = manager.getQueue(filepath, "next");
            expect(next).toEqual(["Five", "Six", "One"]);
            const skip = manager.getQueue(filepath, "skip");
            expect(skip).toEqual(defaultValue.queues.skip);
            const main = manager.getQueue(filepath, "main");
            expect(main).toEqual(["Two", "Three"]);
        });

        it("does nothing if the user wasn't up next", () => {
            const result = manager.replace(filepath, "three");
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: "three wasn't up next" });
        });

        it("reports an empty queue if no one else could be pulled", () => {
            manager.setQueue(filepath, "main", []);
            manager.setQueue(filepath, "next", ["Only"]);
            const result = manager.replace(filepath, "only");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Only is no longer in the queue. No one up next" });
        });
    });

    describe("shiftUserToNext", () => {
        it.each`
            queue
            ${"main"}
            ${"skip"}
        `("moves the user from the $queue queue to the next queue", ({ queue }: { queue: GamesQueueNames }) => {
            const user = defaultValue.queues[queue][0];
            const result = manager.shiftUserToNext(filepath, user);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: `${user} is also up next` });
            const expected = {
                ...defaultValue.queues,
                next: [...defaultValue.queues.next, user],
                [queue]: defaultValue.queues[queue].slice(1),
            };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("does not add someone not in the queue", () => {
            const result = manager.shiftUserToNext(filepath, "unfound");
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: "unfound wasn't in the queue" });
        });

        it("does not reposition someone already in the next queue", () => {
            manager.addUserToQueueEnd(filepath, "main", "Five");
            const result = manager.shiftUserToNext(filepath, "five");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Five is also up next" });
            const next = manager.getQueue(filepath, "next");
            expect(next).toEqual(defaultValue.queues.next);
        });
    });

    describe("shiftSomeToNext", () => {
        it("moves an amount of users from the main queue to the next queue", () => {
            const result = manager.shiftSomeToNext(filepath, 2);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Next 5 in queue: Four, Five, Six, One, Two" });
            const expected = { main: ["Three"], next: [...defaultValue.queues.next, "One", "Two"], skip: defaultValue.queues.skip };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("does not pull from the skip queue on overflow", () => {
            const result = manager.shiftSomeToNext(filepath, 5);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Next 6 in queue: Four, Five, Six, One, Two, Three" });
            const expected = {
                main: [] as string[],
                next: [...defaultValue.queues.next, ...defaultValue.queues.main],
                skip: defaultValue.queues.skip,
            };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("does not add users twice", () => {
            manager.addUserToQueueStart(filepath, "next", "One");
            const result = manager.shiftSomeToNext(filepath, 1);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Next 4 in queue: One, Four, Five, Six" });
            const expected = { main: ["Two", "Three"], next: ["One", ...defaultValue.queues.next], skip: defaultValue.queues.skip };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("reports an empty queue if no one could be pulled", () => {
            manager.setQueue(filepath, "main", []);
            manager.setQueue(filepath, "next", []);
            const result = manager.shiftSomeToNext(filepath, 1);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "No one up next" });
        });
    });

    describe("unshiftUserFromNext", () => {
        it("moves the user from the next queue to the main queue", () => {
            const result = manager.unshiftUserFromNext(filepath, "four");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Four is back in queue at position 4" }); // 🙂
            const expected = { main: ["Four", ...defaultValue.queues.main], next: ["Five", "Six"], skip: defaultValue.queues.skip };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("does not move someone not in the queue", () => {
            const result = manager.unshiftUserFromNext(filepath, "Nine");
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ message: "Nine wasn't up next" });
        });

        it("repositions someone already in the main queue", () => {
            manager.addUserToQueueEnd(filepath, "main", "Five");
            const result = manager.unshiftUserFromNext(filepath, "five");
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "Five is back in queue at position 4" }); // 🙂
            const expected = { main: ["Five", ...defaultValue.queues.main], next: ["Four", "Six"], skip: defaultValue.queues.skip };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });
    });

    describe("unshiftSomeFromNext", () => {
        it("moves an amount of users from the next queue to the main queue", () => {
            const result = manager.unshiftSomeFromNext(filepath, 2);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "There is now 1 user up next" });
            const expected = { main: ["Five", "Six", ...defaultValue.queues.main], next: ["Four"], skip: defaultValue.queues.skip };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("allows overflow", () => {
            const result = manager.unshiftSomeFromNext(filepath, 10);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "There are now 0 users up next" });
            const expected = {
                main: [...defaultValue.queues.next, ...defaultValue.queues.main],
                next: [] as string[],
                skip: defaultValue.queues.skip,
            };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });

        it("repositions someone already in the main queue", () => {
            manager.addUserToQueueEnd(filepath, "main", "Six");
            const result = manager.unshiftSomeFromNext(filepath, 1);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: "There are now 2 users up next" });
            const expected = { main: ["Six", ...defaultValue.queues.main], next: ["Four", "Five"], skip: defaultValue.queues.skip };
            const actual = manager.queueCache[filepath].queues;
            expect(actual).toEqual(expected);
        });
    });

    describe("setEnabled", () => {
        it.each`
            enabled
            ${true}
            ${false}
        `("persists the change to $enabled", ({ enabled }: { enabled: boolean }) => {
            const result = manager.setEnabled(filepath, enabled);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: `The queue is now ${enabled ? "on" : "off"}` });
        });

        it.each`
            enabled
            ${true}
            ${false}
        `("still works if the state was already $enabled", ({ enabled }: { enabled: boolean }) => {
            manager.setExtra(filepath, "enabled", enabled);
            const result = manager.setEnabled(filepath, enabled);
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(manager.writeQueueEffect(filepath));
            expect(result[1]).toMatchObject({ message: `The queue is now ${enabled ? "on" : "off"}` });
        });
    });

    describe("isEnabled", () => {
        it.each`
            enabled
            ${true}
            ${false}
        `("returns the enabled state correctly", ({ enabled }: { enabled: boolean }) => {
            manager.setExtra(filepath, "enabled", enabled);
            const actual = manager.isEnabled(filepath);
            expect(actual).toBe(enabled);
        });
    });
});
