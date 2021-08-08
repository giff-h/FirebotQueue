/**
 * Appends strings from the source array onto the predicate until the length would have gone over maxLength
 * or the array is exhausted
 *
 * The separator is added between strings from the array, but not before the first one. Defaults to ", "
 *
 * Returns the built result and the array of remaining unused strings from the source array
 *
 * @param predicate The start of the string
 * @param source The array of parts to append
 * @param maxLength The length limit of the resulting string
 * @param separator The string to put inbetween parts of the source array
 * @returns The constructed string and the remaining parts from the source array
 */
export function appendToStringFromArrayUntilFull(
    predicate: string,
    source: string[],
    maxLength: number,
    separator = ", ",
): [string, string[]] {
    if (!source.length) {
        return [predicate, []];
    }
    let lengthSoFar = predicate.length;
    const sliceBreak = source.findIndex((part, index) => {
        lengthSoFar += index ? part.length + separator.length : part.length;
        return lengthSoFar > maxLength;
    });
    if (sliceBreak === -1) {
        return [predicate + source.join(separator), []];
    } else {
        return [predicate + source.slice(0, sliceBreak).join(separator), source.slice(sliceBreak)];
    }
}

/**
 * Searches for a string in an array of strings without caring about case
 *
 * @param array Array of strings to search
 * @param x String to search for
 * @returns Index found or -1 if not found
 */
export function caseInsensitiveIndexInArray(array: string[], x: string): number {
    x = x.toLocaleUpperCase();
    return array.findIndex((i) => x === i.toLocaleUpperCase());
}

/**
 * Cleans a value that could be a username string
 *
 * Intended to be used on input from a chat command
 *
 * @param raw Value to clean
 * @returns Cleaned string or null
 */
export function cleanUserName(raw: string): string;
export function cleanUserName(raw: null | undefined): null;
export function cleanUserName(raw: string | null | undefined): string | null {
    if (typeof raw === "string") {
        raw = raw.trim();
        return raw.startsWith("@") ? raw.substring(1) : raw;
    } else {
        return null;
    }
}

/**
 * Makes a deep copy of something
 *
 * Typings should be fully maintained
 *
 * @param obj Value to deep copy
 * @returns Deep copy of obj
 */
export function deepCopy<T extends any>(obj: T[]): T[];
export function deepCopy<T extends any>(obj: T): T;
export function deepCopy(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map((x) => deepCopy(x));
    }
    if (typeof obj === "object" && obj !== null) {
        return Object.entries(obj).reduce((result, [key, value]) => ({ ...result, [key]: deepCopy(value) }), {});
    }
    return obj;
}

/**
 * Check if something is an array of strings. Empty arrays count
 *
 * @param hopefulQueue Value to check
 * @returns true if it's an array of strings or an empty array, false otherwise
 */
export function isStringArray(hopefulQueue: unknown): hopefulQueue is string[] {
    return Array.isArray(hopefulQueue) && hopefulQueue.every((x) => typeof x === "string");
}
