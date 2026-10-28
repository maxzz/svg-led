import { type OptionsAtom, atomWithStoredOptions } from "../../utils/util-hooks/app-specific/atom-with-stored-options";
import { dialogOptionsKey, toolOptionsKey } from "./8-storage-key-defs";

export function atomWithToolOptions<T extends object>(toolId: string, defaults: T): OptionsAtom<T> {
    return atomWithStoredOptions(toolOptionsKey(toolId), defaults);
}

export function atomWithDialogOptions<T extends object>(dialogId: string, defaults: T): OptionsAtom<T> {
    return atomWithStoredOptions(dialogOptionsKey(dialogId), defaults);
}
