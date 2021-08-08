import { Firebot, ScriptReturnObject } from "firebot-custom-scripts-types";
import { Effects } from "firebot-custom-scripts-types/types/effects";
import { gamesQueueHandlers } from "./commands";
import { Params } from "./games-queue";

const script: Firebot.CustomScript<Params> = {
    getScriptManifest: () => {
        return {
            name: "Custom Queue Script",
            description: "A starter custom script for build",
            author: "hamstap85",
            version: "1.0",
            firebotVersion: "5",
        };
    },
    getDefaultParameters: () => {
        return {
            queue: {
                type: "filepath",
                description: "The .json file that holds the data.",
            },
        };
    },
    run: (runRequest) => {
        const { logger } = runRequest.modules;
        const result = { success: true, effects: [] as Effects.Effect[] };
        const trigger = runRequest.trigger.metadata.userCommand?.trigger;
        if (typeof trigger === "string") {
            let handled = false;
            for (const handler of gamesQueueHandlers) {
                if (handler.trigger === trigger) {
                    const parts = handler.parsers.map((parser, index) =>
                        typeof parser === "string"
                            ? runRequest.trigger.metadata.userCommand.args[index] === parser
                            : parser(runRequest, index),
                    );
                    if (parts.every((value) => !!value)) {
                        result.effects.push(
                            ...handler.handler(
                                runRequest,
                                ...parts.filter((value) => typeof value === "string" || typeof value === "number"),
                            ),
                        );
                        handled = true;
                        break;
                    }
                }
            }
            if (!handled) {
                logger.warn(`Unhandled userCommand "${trigger}":`, runRequest);
            }
        } else {
            logger.warn("Trigger was not a string, nothing happens:", runRequest);
        }
        return result as ScriptReturnObject;
    },
};

export default script;
