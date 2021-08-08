/* istanbul ignore file */

import { RunRequest, ScriptModules, UserAccount } from "firebot-custom-scripts-types";
import { Effects } from "firebot-custom-scripts-types/types/effects";
import { LeveledLogMethod } from "firebot-custom-scripts-types/types/modules/logger";
import { Params } from "../src/games-queue";

function makeUserAccount(): UserAccount {
    return {
        username: "",
        displayName: "",
        userId: "",
        avatar: "",
        loggedIn: true,
        auth: { access_token: "", expires_at: "", refresh_token: "" },
    };
}

const readJsonSync: ScriptModules["fs"]["readJsonSync"] = () => null;
const log: LeveledLogMethod = () => void 0;

export function makeRunRequest(
    filepath: string,
    sender?: string | undefined,
    userCommand?: Partial<Effects.Trigger["metadata"]["userCommand"]>,
): RunRequest<Params> {
    return {
        parameters: { queue: filepath },
        modules: {
            logger: { debug: log, info: log, warn: log, error: log },
            fs: { readJsonSync },
        } as unknown as ScriptModules,
        firebot: { accounts: { streamer: makeUserAccount(), bot: makeUserAccount() }, settings: { webServerPort: 0 }, version: "" },
        trigger: {
            type: "command",
            metadata: { username: sender, ...(userCommand ? { userCommand: { trigger: "", args: [], ...userCommand } } : {}) },
        },
    };
}
