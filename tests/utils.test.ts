import { appendToStringFromArrayUntilFull, caseInsensitiveIndexInArray, cleanUserName, deepCopy, isStringArray } from "../src/utils";

describe("appendToStringFromArrayUntilFull", () => {
    it("chains together strings by a separator", () => {
        const predicate = "Predicate: ";
        const strings = ["foo", "bar", "baz", "fizz", "buzz"];
        const separator = " - ";
        const [actual, remainder] = appendToStringFromArrayUntilFull(predicate, strings, 100, separator);
        const expected = predicate + strings.join(separator);
        expect(actual).toEqual(expected);
        expect(remainder).toEqual([]);
    });

    it("returns just the predicate when the list is empty", () => {
        const predicate = "I am all alone";
        const [actual, remainder] = appendToStringFromArrayUntilFull(predicate, [], 100);
        expect(actual).toEqual(predicate);
        expect(remainder).toEqual([]);
    });

    it("stops before max length", () => {
        const predicate = "Long list of things: ";
        const strings = ["apples", "bananas", "cucumbers", "dill", "eggplant", "feta cheese", "garlic"];
        const separator = " and ";
        const [actual, remainder] = appendToStringFromArrayUntilFull(predicate, strings, 70, separator);
        expect(actual.length).toBeLessThanOrEqual(70);
        expect(actual).toMatch(/ and dill$/);
        expect(remainder).toEqual(["eggplant", "feta cheese", "garlic"]);
    });

    it("adds nothing if the predicate is already over-length", () => {
        const predicate = "Really long predicate that should have been checked beforehand";
        const strings = ["never", "see", "me"];
        const [actual, remainder] = appendToStringFromArrayUntilFull(predicate, strings, 10);
        expect(actual).toEqual(predicate);
        expect(remainder).toEqual(strings);
    });

    it("allows equal to max length", () => {
        const predicate = "Predicate ";
        const strings = ["one", "two", "three"];
        const [actual, remainder] = appendToStringFromArrayUntilFull(predicate, strings, 25);
        expect(actual.length).toEqual(25);
        expect(remainder).toEqual([]);
    });
});

describe("caseInsensitiveIndexInArray", () => {
    it("finds strings that are a different case", () => {
        const actual = caseInsensitiveIndexInArray(["UpperCase", "lowercase"], "LowerCase");
        expect(actual).toEqual(1);
    });

    it("doesn't find strings that can't be found", () => {
        const actual = caseInsensitiveIndexInArray(["stringOne"], "stringTwo");
        expect(actual).toEqual(-1);
    });

    it("finds the first occurrence of a string", () => {
        const actual = caseInsensitiveIndexInArray(["Duplicated", "DUPLICATED"], "DUPLICATED");
        expect(actual).toEqual(0);
    });
});

describe("cleanUserName", () => {
    it("trims whitespace", () => {
        const actual = cleanUserName(" withSpace ");
        expect(actual).toEqual("withSpace");
    });

    it("drops the notifier", () => {
        const actual = cleanUserName("@username");
        expect(actual).toEqual("username");
    });

    it("returns null when not a string", () => {
        const actual = cleanUserName([][0]);
        expect(actual).toBeNull();
    });
});

describe("deepCopy", () => {
    it.each`
        typeName     | value
        ${"string"}  | ${"hello"}
        ${"number"}  | ${1}
        ${"boolean"} | ${true}
    `("maintains $typeName primitives", ({ value }) => {
        const result = deepCopy(value);
        expect(result).toBe(result);
    });

    it("deep copies inside a list", () => {
        const original: [number, { b: number }] = [1, { b: 2 }];
        const actual = deepCopy(original);
        original[0] = 3;
        original[1].b = 4;
        expect(actual).toEqual([1, { b: 2 }]);
    });

    it("deep copies inside an object", () => {
        const original = { a: [1, 2], b: "c" };
        const actual = deepCopy(original);
        original.a[0] = 3;
        original.b = "f";
        expect(actual).toEqual({ a: [1, 2], b: "c" });
    });
});

describe("isStringArray", () => {
    it("returns true for empty arrays", () => {
        const actual = isStringArray([]);
        expect(actual).toBeTruthy();
    });

    it("returns false for a string", () => {
        const actual = isStringArray("not an array");
        expect(actual).toBeFalsy();
    });

    it("returns true for string arrays", () => {
        const actual = isStringArray(["array", "of", "strings"]);
        expect(actual).toBeTruthy();
    });
});
