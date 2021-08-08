import { ScriptModules } from "firebot-custom-scripts-types";
import { QueueFile, UserQueueManager } from "../src/user-queue-manager";

const filepath = "foo.json";
type TestQueueNames = "one" | "two" | "three";
interface TestExtras {
    buckle: string;
    shoe: boolean;
    count: number;
    laces: string[];
}

class TestQueueManager extends UserQueueManager<TestQueueNames, TestExtras> {
    constructor(defaults: QueueFile<TestQueueNames, TestExtras>, readJsonSync: any) {
        super(defaults, { readJsonSync } as unknown as ScriptModules["fs"]);
    }

    cleanExtras(extras: Record<keyof TestExtras, unknown>): TestExtras {
        const buckle = typeof extras.buckle === "string" ? extras.buckle : "my cleaned";
        const shoe = !!extras.shoe;
        const count = Number.isNaN(extras.count) ? 30 : Math.abs(Math.trunc(extras.count as number));
        const laces = Array.isArray(extras.laces) ? extras.laces.map((x) => `${x}`) : [];
        return { buckle, shoe, count, laces };
    }
}

describe("BaseUserQueueManager", () => {
    let defaultValue: QueueFile<TestQueueNames, TestExtras>;
    let manager: TestQueueManager;
    const readJsonSync = jest.fn(
        (..._args: jest.ArgsType<ScriptModules["fs"]["readJsonSync"]>): ReturnType<ScriptModules["fs"]["readJsonSync"]> => null,
    );

    beforeEach(() => {
        defaultValue = {
            queues: { one: ["DefaultOne"], two: ["DefaultTwo"], three: ["DefaultThree"] },
            extras: { buckle: "my", shoe: true, count: 3, laces: [] },
        };
        manager = new TestQueueManager(defaultValue, readJsonSync);
    });

    describe("queueCache", () => {
        it("is empty to start", () => {
            expect(manager.queueCache).toEqual({});
        });
    });

    describe("loadData", () => {
        it("sets the file contents if valid", () => {
            const valid = {
                queues: { one: ["hello"], two: ["world"], three: ["foobar"] },
                extras: { buckle: "your", shoe: true, count: 4, laces: ["cross"] },
            };
            readJsonSync.mockReturnValue(valid);
            manager.loadData(filepath);
            expect(manager.queueCache[filepath]).toEqual(valid);
        });

        it("cleans the file contents if partially valid", () => {
            const partiallyValid = {
                queues: { one: ["hello"], two: [2] },
                extras: { buckle: 1, count: 6.2 },
            };
            const expected = {
                queues: { ...defaultValue.queues, one: ["hello"] },
                extras: { ...defaultValue.extras, buckle: "my cleaned", count: 6 },
            };
            readJsonSync.mockReturnValue(partiallyValid);
            manager.loadData(filepath);
            expect(manager.queueCache[filepath]).toEqual(expected);
        });

        it("cleans the file contents of any unexpected properties without queues", () => {
            const strangeData = {
                cues: { one: ["invalid"], two: ["properties"] },
                extras: { buckle: "two", boot: true },
            };
            const expected = {
                queues: defaultValue.queues,
                extras: { ...defaultValue.extras, buckle: "two" },
            };
            readJsonSync.mockReturnValue(strangeData);
            manager.loadData(filepath);
            expect(manager.queueCache[filepath]).toEqual(expected);
        });

        it("cleans the file contents of any unexpected properties without extras", () => {
            const strangeData = {
                queues: { won: ["DefaultTwo"], two: ["DefaultOne"] },
                extraExtra: { shoe: false, count: 10 },
            };
            const expected = {
                queues: { ...defaultValue.queues, two: ["DefaultOne"] },
                extras: defaultValue.extras,
            };
            readJsonSync.mockReturnValue(strangeData);
            manager.loadData(filepath);
            expect(manager.queueCache[filepath]).toEqual(expected);
        });

        it("sets the given default if the file contents are fully invalid", () => {
            readJsonSync.mockReturnValue("invalid");
            manager.loadData(filepath);
            expect(manager.queueCache[filepath]).toEqual(defaultValue);
        });
    });

    describe("writeQueueEffect", () => {
        it("creates an effect for Firebot", () => {
            // Populate the cache
            manager.getQueue(filepath, "one");
            const actual = manager.writeQueueEffect(filepath);
            expect(Object.keys(actual).sort()).toEqual(["filepath", "text", "type", "writeMode"]);
            expect(actual).toMatchObject({ type: "firebot:filewriter", filepath, writeMode: "replace" });
            expect(JSON.parse(actual.text as string)).toEqual(defaultValue);
        });

        it("is different after a change has happened", () => {
            // Populate the cache
            manager.getQueue(filepath, "one");
            const before = manager.writeQueueEffect(filepath);
            manager.mergeSourceQueueToTargetQueueStart(filepath, "one", "two");
            const after = manager.writeQueueEffect(filepath);
            expect(before).not.toEqual(after);
        });
    });

    describe("getQueue", () => {
        it("returns the expected queue", () => {
            const actual = manager.getQueue(filepath, "one");
            expect(actual).toEqual(defaultValue.queues.one);
        });

        it("is unaffected by changing the given value after the fact", () => {
            const actual = manager.getQueue(filepath, "one");
            manager.queueCache[filepath].queues.one.push("extra value");
            expect(actual).toEqual(["DefaultOne"]);
        });
    });

    describe("setQueue", () => {
        it("populates the cache with the new queue", () => {
            const expected = ["oh_hi_mark"];
            manager.setQueue(filepath, "two", expected);
            expect(manager.queueCache[filepath].queues.two).toEqual(expected);
        });

        it("leaves other queues untouched", () => {
            manager.setQueue(filepath, "two", ["new"]);
            expect(manager.queueCache[filepath].queues.one).toEqual(defaultValue.queues.one);
        });
    });

    describe("getExtra", () => {
        it("returns the extra data", () => {
            const actual = manager.getExtra(filepath, "buckle");
            expect(actual).toEqual(defaultValue.extras.buckle);
        });

        it("is unaffected by changing the given value after the fact", () => {
            const actual = manager.getExtra(filepath, "laces");
            defaultValue.extras.laces.push("extra value");
            expect(actual).toEqual([]);
        });
    });

    describe("setExtra", () => {
        it("populates the cache with the new extra data", () => {
            manager.setExtra(filepath, "count", 12.4);
            const expected = {
                queues: defaultValue.queues,
                extras: { ...defaultValue.extras, count: 12 },
            };
            expect(manager.queueCache[filepath]).toEqual(expected);
        });
    });

    describe("addUserToQueueStart", () => {
        it("puts the user on the end of the queue", () => {
            const result = manager.addUserToQueueStart(filepath, "one", "newUser");
            expect(result).toEqual({ user: "newUser", index: 0, added: true });
            const expected = ["newUser", ...defaultValue.queues.one];
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("leaves the user in the queue if they exist", () => {
            const expected = ["userOne", "userTwo"];
            defaultValue.queues.one = expected;
            manager = new TestQueueManager(defaultValue, readJsonSync);
            const result = manager.addUserToQueueStart(filepath, "one", "usertwo");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
            expect(result).toEqual({ user: "userTwo", index: 1, added: false });
        });

        it("leaves other queues untouched", () => {
            const expected = [...defaultValue.queues.two];
            manager.addUserToQueueStart(filepath, "one", "newUser");
            expect(manager.queueCache[filepath].queues.two).toEqual(expected);
        });
    });

    describe("addUserToQueueEnd", () => {
        it("puts the user on the end of the queue", () => {
            const result = manager.addUserToQueueEnd(filepath, "one", "newUser");
            expect(result).toEqual({ user: "newUser", index: 1, added: true });
            const expected = [...defaultValue.queues.one, "newUser"];
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("leaves the user in the queue if they exist", () => {
            const expected = ["userOne", "userTwo"];
            defaultValue.queues.one = expected;
            manager = new TestQueueManager(defaultValue, readJsonSync);
            const result = manager.addUserToQueueEnd(filepath, "one", "userone");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
            expect(result).toEqual({ user: "userOne", index: 0, added: false });
        });

        it("leaves other queues untouched", () => {
            const expected = [...defaultValue.queues.two];
            manager.addUserToQueueEnd(filepath, "one", "newUser");
            expect(manager.queueCache[filepath].queues.two).toEqual(expected);
        });
    });

    describe("mergeSourceQueueToTargetQueueStart", () => {
        it("puts the source at the start of the target", () => {
            const expected = [...defaultValue.queues.two, ...defaultValue.queues.one];
            manager.mergeSourceQueueToTargetQueueStart(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("clears the source queue", () => {
            manager.mergeSourceQueueToTargetQueueStart(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.two).toEqual([]);
        });

        it("maintains the target queue position when deduplicating", () => {
            defaultValue.queues.one.push("duplicate");
            const expected = [...defaultValue.queues.two, ...defaultValue.queues.one];
            defaultValue.queues.two.push("duplicate");
            manager = new TestQueueManager(defaultValue, readJsonSync);
            manager.mergeSourceQueueToTargetQueueStart(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("is case insensitive", () => {
            defaultValue.queues.one.push("duplicate");
            const expected = [...defaultValue.queues.two, ...defaultValue.queues.one];
            defaultValue.queues.two.push("DUPLICATE");
            manager = new TestQueueManager(defaultValue, readJsonSync);
            manager.mergeSourceQueueToTargetQueueStart(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("leaves other queues untouched", () => {
            manager.mergeSourceQueueToTargetQueueStart(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.three).toEqual(defaultValue.queues.three);
        });
    });

    describe("mergeSourceQueueToTargetQueueEnd", () => {
        it("puts the source at the end of the target", () => {
            const expected = [...defaultValue.queues.one, ...defaultValue.queues.two];
            manager.mergeSourceQueueToTargetQueueEnd(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("clears the source queue", () => {
            manager.mergeSourceQueueToTargetQueueEnd(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.two).toEqual([]);
        });

        it("maintains the target queue position when deduplicating", () => {
            defaultValue.queues.one.push("duplicate");
            const expected = [...defaultValue.queues.one, ...defaultValue.queues.two];
            defaultValue.queues.two.push("duplicate");
            manager = new TestQueueManager(defaultValue, readJsonSync);
            manager.mergeSourceQueueToTargetQueueEnd(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("is case insensitive", () => {
            defaultValue.queues.one.push("duplicate");
            const expected = [...defaultValue.queues.one, ...defaultValue.queues.two];
            defaultValue.queues.two.push("DUPLICATE");
            manager = new TestQueueManager(defaultValue, readJsonSync);
            manager.mergeSourceQueueToTargetQueueEnd(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.one).toEqual(expected);
        });

        it("leaves other queues untouched", () => {
            manager.mergeSourceQueueToTargetQueueEnd(filepath, "one", "two");
            expect(manager.queueCache[filepath].queues.three).toEqual(defaultValue.queues.three);
        });
    });

    describe("removeUserFromQueue", () => {
        it("removes the user from the queue", () => {
            const actual = manager.removeUserFromQueue(filepath, "one", "DefaultOne");
            expect(actual).toEqual({ user: "DefaultOne", removed: true });
        });

        it("is case insensitive", () => {
            const actual = manager.removeUserFromQueue(filepath, "one", "defaultone");
            expect(actual).toEqual({ user: "DefaultOne", removed: true });
        });

        it("does nothing if the user wasn't in the queue", () => {
            const actual = manager.removeUserFromQueue(filepath, "one", "notFound");
            expect(actual).toEqual({ user: "notFound", removed: false });
        });

        it("leaves the other users in the queue", () => {
            defaultValue.queues.one = ["one", "two", "three", "four", "five"];
            manager = new TestQueueManager(defaultValue, readJsonSync);
            manager.removeUserFromQueue(filepath, "one", "three");
            expect(manager.queueCache[filepath].queues.one).toEqual(["one", "two", "four", "five"]);
        });

        it("leaves other queues untouched", () => {
            manager.removeUserFromQueue(filepath, "one", "DefaultOne");
            expect(manager.queueCache[filepath].queues.two).toEqual(defaultValue.queues.two);
        });
    });

    describe("removeAmountOfUsersFromQueueStart", () => {
        it("removes users from the start", () => {
            defaultValue.queues.one = ["one", "two", "three", "four", "five"];
            manager = new TestQueueManager(defaultValue, readJsonSync);
            const actual = manager.removeAmountOfUsersFromQueueStart(filepath, "one", 3);
            expect(actual).toEqual(["one", "two", "three"]);
            expect(manager.queueCache[filepath].queues.one).toEqual(["four", "five"]);
        });

        it("allows overflow of amount", () => {
            const actual = manager.removeAmountOfUsersFromQueueStart(filepath, "one", 3);
            expect(actual).toEqual(["DefaultOne"]);
            expect(manager.queueCache[filepath].queues.one).toEqual([]);
        });

        it("leaves other queues untouched", () => {
            manager.removeAmountOfUsersFromQueueStart(filepath, "one", 3);
            expect(manager.queueCache[filepath].queues.two).toEqual(defaultValue.queues.two);
        });
    });

    describe("removeAmountOfUsersFromQueueEnd", () => {
        it("removes users from the end", () => {
            defaultValue.queues.one = ["one", "two", "three", "four", "five"];
            manager = new TestQueueManager(defaultValue, readJsonSync);
            const actual = manager.removeAmountOfUsersFromQueueEnd(filepath, "one", 3);
            expect(actual).toEqual(["three", "four", "five"]);
            expect(manager.queueCache[filepath].queues.one).toEqual(["one", "two"]);
        });

        it("allows overflow of amount", () => {
            const actual = manager.removeAmountOfUsersFromQueueEnd(filepath, "one", 3);
            expect(actual).toEqual(["DefaultOne"]);
            expect(manager.queueCache[filepath].queues.one).toEqual([]);
        });

        it("leaves other queues untouched", () => {
            manager.removeAmountOfUsersFromQueueEnd(filepath, "one", 3);
            expect(manager.queueCache[filepath].queues.two).toEqual(defaultValue.queues.two);
        });
    });
});
