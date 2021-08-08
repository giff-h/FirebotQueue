import { ScriptReturnObject } from "firebot-custom-scripts-types";
import { GamesQueue } from "../src/games-queue";
import script from "../src/main";
import { makeRunRequest } from "./runRequest.mock";

describe("getScriptManifest", () => {
    it("returns the expected manifest", () => {
        const expected = {
            name: "Custom Queue Script",
            description: "A starter custom script for build",
            author: "hamstap85",
            version: "1.0",
            firebotVersion: "5",
        };
        const actual = script.getScriptManifest();
        expect(actual).toEqual(expected);
    });
});

describe("getDefaultParameters", () => {
    it("returns the expected parameters", () => {
        const expected = {
            queue: {
                type: "filepath",
                description: "The .json file that holds the data.",
            },
        };
        const actual = script.getDefaultParameters();
        expect(actual).toEqual(expected);
    });
});

describe("run", () => {
    const filepath = "foo.json";

    afterEach(() => jest.restoreAllMocks());

    describe("!join", () => {
        it("adds the sender to the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!join", sender: "Sender" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function", () => {
            const addMock = jest.spyOn(GamesQueue.prototype, "add");
            const runRequest = makeRunRequest(filepath, { trigger: "!join", sender: "Sender" });
            script.run(runRequest);
            expect(addMock).toHaveBeenCalledTimes(1);
            expect(addMock).toHaveBeenCalledWith(filepath, "Sender");
        });

        it("does nothing with no sender", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!join" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!leave", () => {
        it("attempts to remove the sender from the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!leave", sender: "Sender" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function", () => {
            const removeMock = jest.spyOn(GamesQueue.prototype, "remove");
            const runRequest = makeRunRequest(filepath, { trigger: "!leave", sender: "Sender" });
            script.run(runRequest);
            expect(removeMock).toHaveBeenCalledTimes(1);
            expect(removeMock).toHaveBeenCalledWith(filepath, "Sender");
        });

        it("does nothing with no sender", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!leave" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!rejoin", () => {
        it("rejoins the sender in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!rejoin", sender: "Sender" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function", () => {
            const moveToBackMock = jest.spyOn(GamesQueue.prototype, "moveToBack");
            const runRequest = makeRunRequest(filepath, { trigger: "!rejoin", sender: "Sender" });
            script.run(runRequest);
            expect(moveToBackMock).toHaveBeenCalledTimes(1);
            expect(moveToBackMock).toHaveBeenCalledWith(filepath, "Sender");
        });

        it("does nothing with no sender", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!rejoin" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!skip", () => {
        it("attempts to skip the sender in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!skip", sender: "Sender" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function", () => {
            const skipMock = jest.spyOn(GamesQueue.prototype, "skip");
            const runRequest = makeRunRequest(filepath, { trigger: "!skip", sender: "Sender" });
            script.run(runRequest);
            expect(skipMock).toHaveBeenCalledTimes(1);
            expect(skipMock).toHaveBeenCalledWith(filepath, "Sender");
        });

        it("does nothing with no sender", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!skip" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!queue list", () => {
        it("lists the users in queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["list"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function", () => {
            const listMock = jest.spyOn(GamesQueue.prototype, "list");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["list"] });
            script.run(runRequest);
            expect(listMock).toHaveBeenCalledTimes(1);
            expect(listMock).toHaveBeenCalledWith(filepath);
        });
    });

    describe("!queue next", () => {
        it("prepares the next queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["next", "1"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function", () => {
            const prepareNextMock = jest.spyOn(GamesQueue.prototype, "prepareNext");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["next", "1"] });
            script.run(runRequest);
            expect(prepareNextMock).toHaveBeenCalledTimes(1);
            expect(prepareNextMock).toHaveBeenCalledWith(filepath, 1);
        });

        it("does nothing if the arg is not a number", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["next", "one"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });

        it("requires an arg", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["next"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!queue remove", () => {
        it("attempts to remove the user from the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["remove", "user"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function", () => {
            const removeMock = jest.spyOn(GamesQueue.prototype, "remove");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["remove", "user"] });
            script.run(runRequest);
            expect(removeMock).toHaveBeenCalledTimes(1);
            expect(removeMock).toHaveBeenCalledWith(filepath, "user");
        });

        it("requires an arg", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["remove"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!queue replace", () => {
        it("attempts to replace the user in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["replace", "user"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function", () => {
            const replaceMock = jest.spyOn(GamesQueue.prototype, "replace");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["replace", "user"] });
            script.run(runRequest);
            expect(replaceMock).toHaveBeenCalledTimes(1);
            expect(replaceMock).toHaveBeenCalledWith(filepath, "user");
        });

        it("requires an arg", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["replace"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("!queue shift", () => {
        it("attempts to shift the user in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["shift", "user"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function for a user", () => {
            const shiftSomeToNextMock = jest.spyOn(GamesQueue.prototype, "shiftSomeToNext");
            const shiftUserToNextMock = jest.spyOn(GamesQueue.prototype, "shiftUserToNext");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["shift", "user"] });
            script.run(runRequest);
            expect(shiftUserToNextMock).toHaveBeenCalledTimes(1);
            expect(shiftUserToNextMock).toHaveBeenCalledWith(filepath, "user");
            expect(shiftSomeToNextMock).not.toHaveBeenCalled();
        });

        it("shifts some users in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["shift", "1"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function for a number", () => {
            const shiftSomeToNextMock = jest.spyOn(GamesQueue.prototype, "shiftSomeToNext");
            const shiftUserToNextMock = jest.spyOn(GamesQueue.prototype, "shiftUserToNext");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["shift", "1"] });
            script.run(runRequest);
            expect(shiftSomeToNextMock).toHaveBeenCalledTimes(1);
            expect(shiftSomeToNextMock).toHaveBeenCalledWith(filepath, 1);
            expect(shiftUserToNextMock).not.toHaveBeenCalled();
        });
    });

    describe("!queue unshift", () => {
        it("attempts to unshift the user in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["unshift", "user"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(1);
        });

        it("calls the correct function for a user", () => {
            const unshiftSomeFromNext = jest.spyOn(GamesQueue.prototype, "unshiftSomeFromNext");
            const unshiftUserFromNext = jest.spyOn(GamesQueue.prototype, "unshiftUserFromNext");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["unshift", "user"] });
            script.run(runRequest);
            expect(unshiftUserFromNext).toHaveBeenCalledTimes(1);
            expect(unshiftUserFromNext).toHaveBeenCalledWith(filepath, "user");
            expect(unshiftSomeFromNext).not.toHaveBeenCalled();
        });

        it("unshifts some users in the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["unshift", "1"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function for a number", () => {
            const unshiftSomeFromNextMock = jest.spyOn(GamesQueue.prototype, "unshiftSomeFromNext");
            const unshiftUserFromNextMock = jest.spyOn(GamesQueue.prototype, "unshiftUserFromNext");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["unshift", "1"] });
            script.run(runRequest);
            expect(unshiftSomeFromNextMock).toHaveBeenCalledTimes(1);
            expect(unshiftSomeFromNextMock).toHaveBeenCalledWith(filepath, 1);
            expect(unshiftUserFromNextMock).not.toHaveBeenCalled();
        });
    });

    describe("!queue on", () => {
        it("enables the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["on"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function", () => {
            const setEnabledMock = jest.spyOn(GamesQueue.prototype, "setEnabled");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["on"] });
            script.run(runRequest);
            expect(setEnabledMock).toHaveBeenCalledTimes(1);
            expect(setEnabledMock).toHaveBeenCalledWith(filepath, true);
        });
    });

    describe("!queue off", () => {
        it("disables the queue", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["off"] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(2);
        });

        it("calls the correct function", () => {
            const setEnabledMock = jest.spyOn(GamesQueue.prototype, "setEnabled");
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: ["off"] });
            script.run(runRequest);
            expect(setEnabledMock).toHaveBeenCalledTimes(1);
            expect(setEnabledMock).toHaveBeenCalledWith(filepath, false);
        });
    });

    describe("!queue", () => {
        it("does nothing with no args", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue", args: [] });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });

        it("does nothing without args", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!queue" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("handlers", () => {
        it("does nothing with an unhandled trigger", () => {
            const runRequest = makeRunRequest(filepath, { trigger: "!win" });
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });

    describe("not a command", () => {
        it("does nothing without a trigger", () => {
            const runRequest = makeRunRequest(filepath, {});
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });

        it("does nothing without a command", () => {
            const runRequest = makeRunRequest(filepath);
            const actual = (script.run(runRequest) as ScriptReturnObject).effects;
            expect(actual).toHaveLength(0);
        });
    });
});
