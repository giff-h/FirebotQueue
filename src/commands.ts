import { RunRequest } from "firebot-custom-scripts-types";
import { Effects } from "firebot-custom-scripts-types/types/effects";
import { GamesQueue, GamesQueueExtras, GamesQueueNames, Params } from "./games-queue";
import { QueueFile } from "./user-queue-manager";
import { cleanUserName } from "./utils";

type Parser<R> = (runRequest: RunRequest<Params>, index?: number) => R | null;

interface TriggerHandler {
    trigger: string;
    parsers: Array<Parser<string | number> | string>;
    handler: (runRequest: RunRequest<Params>, ...args: any) => Effects.Effect[];
}

const defaultQueue: QueueFile<GamesQueueNames, GamesQueueExtras> = { queues: { main: [], next: [], skip: [] }, extras: { enabled: true } };

export function commandSender(runRequest: RunRequest<Params>): string | null {
    return runRequest.trigger.metadata.command?.sender ?? null;
}

export function argAsUser(runRequest: RunRequest<Params>, index: number): string | null {
    const x = cleanUserName(runRequest.trigger.metadata.command?.args?.[index]);
    return x?.length ? x : null;
}

export function argAsPositiveInteger(runRequest: RunRequest<Params>, index: number): number | null {
    const x = Number(runRequest.trigger.metadata.command?.args?.[index]?.trim() ?? NaN);
    return !isNaN(x) && Number.isInteger(x) && x > 0 ? x : null;
}

export function addSender(runRequest: RunRequest<Params>, sender: string): Effects.Effect[] {
    const manager = new GamesQueue(defaultQueue, runRequest.modules.fs);
    const filepath = runRequest.parameters.queue;
    return manager.isEnabled(filepath) ? manager.add(filepath, sender) : [];
}

export function removeSender(runRequest: RunRequest<Params>, sender: string): Effects.Effect[] {
    const manager = new GamesQueue(defaultQueue, runRequest.modules.fs);
    const filepath = runRequest.parameters.queue;
    return manager.isEnabled(filepath) ? manager.remove(filepath, sender) : [];
}

export function reAddSender(runRequest: RunRequest<Params>, sender: string): Effects.Effect[] {
    const manager = new GamesQueue(defaultQueue, runRequest.modules.fs);
    const filepath = runRequest.parameters.queue;
    return manager.isEnabled(filepath) ? manager.moveToBack(filepath, sender) : [];
}

export function skipSender(runRequest: RunRequest<Params>, sender: string): Effects.Effect[] {
    const manager = new GamesQueue(defaultQueue, runRequest.modules.fs);
    const filepath = runRequest.parameters.queue;
    return manager.isEnabled(filepath) ? manager.skip(filepath, sender) : [];
}

export function listQueue(runRequest: RunRequest<Params>): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).list(runRequest.parameters.queue);
}

export function prepareNext(runRequest: RunRequest<Params>, amount: number): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).prepareNext(runRequest.parameters.queue, amount);
}

export function removeUser(runRequest: RunRequest<Params>, user: string): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).remove(runRequest.parameters.queue, user);
}

export function replaceUser(runRequest: RunRequest<Params>, user: string): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).replace(runRequest.parameters.queue, user);
}

export function shiftSome(runRequest: RunRequest<Params>, amount: number): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).shiftSomeToNext(runRequest.parameters.queue, amount);
}

export function shiftUser(runRequest: RunRequest<Params>, user: string): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).shiftUserToNext(runRequest.parameters.queue, user);
}

export function unshiftSome(runRequest: RunRequest<Params>, amount: number): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).unshiftSomeFromNext(runRequest.parameters.queue, amount);
}

export function unshiftUser(runRequest: RunRequest<Params>, user: string): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).unshiftUserFromNext(runRequest.parameters.queue, user);
}

export function enable(runRequest: RunRequest<Params>): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).setEnabled(runRequest.parameters.queue, true);
}

export function disable(runRequest: RunRequest<Params>): Effects.Effect[] {
    return new GamesQueue(defaultQueue, runRequest.modules.fs).setEnabled(runRequest.parameters.queue, false);
}

export const gamesQueueHandlers: TriggerHandler[] = [
    { trigger: "!join", parsers: [commandSender], handler: addSender },
    { trigger: "!leave", parsers: [commandSender], handler: removeSender },
    { trigger: "!rejoin", parsers: [commandSender], handler: reAddSender },
    { trigger: "!skip", parsers: [commandSender], handler: skipSender },
    { trigger: "!queue", parsers: ["list"], handler: listQueue },
    { trigger: "!queue", parsers: ["next", argAsPositiveInteger], handler: prepareNext },
    { trigger: "!queue", parsers: ["remove", argAsUser], handler: removeUser },
    { trigger: "!queue", parsers: ["replace", argAsUser], handler: replaceUser },
    { trigger: "!queue", parsers: ["shift", argAsPositiveInteger], handler: shiftSome },
    { trigger: "!queue", parsers: ["shift", argAsUser], handler: shiftUser },
    { trigger: "!queue", parsers: ["unshift", argAsPositiveInteger], handler: unshiftSome },
    { trigger: "!queue", parsers: ["unshift", argAsUser], handler: unshiftUser },
    { trigger: "!queue", parsers: ["on"], handler: enable },
    { trigger: "!queue", parsers: ["off"], handler: disable },
];
