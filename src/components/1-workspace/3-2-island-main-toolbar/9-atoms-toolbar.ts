import { atom } from "jotai";
import { activeToolIdAtom, heldKeysAtom, toolGestureActiveAtom, toolLockedAtom } from "@/store/4-editor";
import { getTool } from "@/tools";

/** Hint line under the toolbar for the active tool; it follows the held modifier keys and the pointer gesture */
export const toolHintAtom = atom(
    (get) => getTool(get(activeToolIdAtom)).hint({
        get,
        held: get(heldKeysAtom),
        dragging: get(toolGestureActiveAtom),
    })
);

export const toggleToolLockAtom = atom(
    null,
    (get, set) => set(toolLockedAtom, !get(toolLockedAtom))
);
