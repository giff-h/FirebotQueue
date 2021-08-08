import {
    addSender,
    argAsPositiveInteger,
    argAsUser,
    commandSender,
    disable,
    enable,
    listQueue,
    prepareNext,
    reAddSender,
    removeSender,
    removeUser,
    replaceUser,
    shiftSome,
    shiftUser,
    skipSender,
    unshiftSome,
    unshiftUser,
} from "../src/commands";
import { makeRunRequest } from "./runRequest.mock";

const filepath = "foo.json";

describe("commandSender", () => {
    it("extracts the command sender", () => {
        const expected = "Sender";
        const runRequest = makeRunRequest(filepath, { sender: expected });
        const actual = commandSender(runRequest);
        expect(actual).toEqual(expected);
    });

    it("defaults to null when it can't find the sender", () => {
        const runRequest = makeRunRequest(filepath);
        const actual = commandSender(runRequest);
        expect(actual).toBeNull();
    });
});

describe("argAsUser", () => {
    it("cleans the user arg", () => {
        const expected = "userName";
        const runRequest = makeRunRequest(filepath, { args: ["@" + expected] });
        const actual = argAsUser(runRequest, 0);
        expect(actual).toEqual(expected);
    });

    it("defaults to null when it can't parse the arg", () => {
        const runRequest = makeRunRequest(filepath, { args: [] });
        const actual = argAsUser(runRequest, 0);
        expect(actual).toBeNull();
    });

    it("defaults to null when there are no args", () => {
        const runRequest = makeRunRequest(filepath);
        const actual = argAsUser(runRequest, 0);
        expect(actual).toBeNull();
    });
});

describe("argAsPositiveInteger", () => {
    it("cleans the number arg", () => {
        const expected = 4;
        const runRequest = makeRunRequest(filepath, { args: [`${expected}`] });
        const actual = argAsPositiveInteger(runRequest, 0);
        expect(actual).toEqual(expected);
    });

    it("rejects floats", () => {
        const runRequest = makeRunRequest(filepath, { args: ["2.2"] });
        const actual = argAsPositiveInteger(runRequest, 0);
        expect(actual).toBeNull();
    });

    it("defaults to null when it can't parse the arg", () => {
        const runRequest = makeRunRequest(filepath, { args: [] });
        const actual = argAsPositiveInteger(runRequest, 0);
        expect(actual).toBeNull();
    });

    it("defaults to null when there are no args", () => {
        const runRequest = makeRunRequest(filepath);
        const actual = argAsPositiveInteger(runRequest, 0);
        expect(actual).toBeNull();
    });
});

describe("addSender", () => {
    it("adds the sender if the queue is enabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = addSender(runRequest, "Sender");
        expect(actual).toHaveLength(2);
    });

    it("does nothing if the queue is disabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: false } });
        const actual = addSender(runRequest, "Sender");
        expect(actual).toHaveLength(0);
    });
});

describe("removeSender", () => {
    it("attempts to remove the sender if the queue is enabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = removeSender(runRequest, "Sender");
        expect(actual).toHaveLength(1);
    });

    it("does nothing if the queue is disabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: false } });
        const actual = removeSender(runRequest, "Sender");
        expect(actual).toHaveLength(0);
    });
});

describe("reAddSender", () => {
    it("readds the sender if the queue is enabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = reAddSender(runRequest, "Sender");
        expect(actual).toHaveLength(2);
    });

    it("does nothing if the queue is disabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: false } });
        const actual = reAddSender(runRequest, "Sender");
        expect(actual).toHaveLength(0);
    });
});

describe("skipSender", () => {
    it("attempts to skip the sender if the queue is enabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = skipSender(runRequest, "Sender");
        expect(actual).toHaveLength(1);
    });

    it("does nothing if the queue is disabled", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: false } });
        const actual = skipSender(runRequest, "Sender");
        expect(actual).toHaveLength(0);
    });
});

describe("listQueue", () => {
    it("lists users in queue", () => {
        const runRequest = makeRunRequest(filepath);
        const actual = listQueue(runRequest);
        expect(actual).toHaveLength(1);
    });
});

describe("prepareNext", () => {
    it("prepares the next queue", () => {
        const runRequest = makeRunRequest(filepath);
        const actual = prepareNext(runRequest, 1);
        expect(actual).toHaveLength(2);
    });
});

describe("removeUser", () => {
    it("attempts to remove the user from the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = removeUser(runRequest, "user");
        expect(actual).toHaveLength(1);
    });
});

describe("replaceUser", () => {
    it("attempts to replace the user in the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = replaceUser(runRequest, "user");
        expect(actual).toHaveLength(1);
    });
});

describe("shiftSome", () => {
    it("shifts some in the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = shiftSome(runRequest, 1);
        expect(actual).toHaveLength(2);
    });
});

describe("shiftUser", () => {
    it("attempts to shift the user in the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = shiftUser(runRequest, "user");
        expect(actual).toHaveLength(1);
    });
});

describe("unshiftSome", () => {
    it("unshifts some in the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = unshiftSome(runRequest, 1);
        expect(actual).toHaveLength(2);
    });
});

describe("unshiftUser", () => {
    it("attempts to unshift the user in the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = unshiftUser(runRequest, "user");
        expect(actual).toHaveLength(1);
    });
});

describe("enable", () => {
    it("enables the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = enable(runRequest);
        expect(actual).toHaveLength(2);
    });
});

describe("disable", () => {
    it("disables the queue", () => {
        const runRequest = makeRunRequest(filepath);
        jest.spyOn(runRequest.modules.fs, "readJsonSync").mockReturnValue({ extras: { enabled: true } });
        const actual = disable(runRequest);
        expect(actual).toHaveLength(2);
    });
});
