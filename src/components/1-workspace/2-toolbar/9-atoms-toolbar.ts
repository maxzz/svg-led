import { atom } from "jotai";
import { activeToolIdAtom, toolLockedAtom } from "@/store/4-editor";
import { getTool } from "@/tools";

/** Hint line under the toolbar for the active tool */
export const toolHintAtom = atom(
    (get) => getTool(get(activeToolIdAtom)).hint
);

export const toggleToolLockAtom = atom(
    null,
    (get, set) => set(toolLockedAtom, !get(toolLockedAtom))
);
