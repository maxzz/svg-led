import { atom } from "jotai";
import { getCommand } from "./0-all-commands";

/** Runs a command by id from any component: useSetAtom(runCommandAtom)("file.open") */
export const runCommandAtom = atom(
    null,
    (get, set, id: string) => {
        const cmd = getCommand(id);
        if (cmd && (!cmd.enabled || cmd.enabled(get))) {
            void cmd.run({ get, set });
        }
    }
);
