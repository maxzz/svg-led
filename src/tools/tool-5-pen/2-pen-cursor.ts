import { atom } from "jotai";
import { heldKeysAtom, toolGestureActiveAtom } from "@/store/4-editor";
import { MODIFIERS, isMod } from "../tool-2-select/8-definition-of-modifiers";
import { type PenAction, type PenActionType } from "./1-pen-edit-points";

const M = MODIFIERS.pen;

/** What a click would do where the pointer hovers; set by the Pen tool on hover, cleared when the pointer leaves */
const penHoverActionAtom = atom<PenActionType | null>(null);

export const setPenHoverActionAtom = atom(
    null,
    (get, set, action: PenAction | null) => {
        const type = action?.type ?? null;
        get(penHoverActionAtom) !== type && set(penHoverActionAtom, type);
    }
);

/** True when the modifier that places plain points over paths is held, or was held at the click */
export function autoAddDeleteOff(keys: { shift: boolean; alt: boolean; ctrl: boolean; }): boolean {
    return isMod(keys, M.noAutoAddDelete);
}

/** Pen cursor class (cursors plugin): a badge at the lower right shows what a click does */
export const penCursorAtom = atom(
    (get) => {
        if (get(toolGestureActiveAtom)) {
            return 'cursor-pen';
        }
        const action = get(penHoverActionAtom);
        const plainOnly = autoAddDeleteOff(get(heldKeysAtom));
        switch (action) {
            case 'add': return plainOnly ? 'cursor-pen' : 'cursor-pen-add';
            case 'delete': return plainOnly ? 'cursor-pen' : 'cursor-pen-delete';
            case 'continue': return 'cursor-pen-continue';
            case 'close': return 'cursor-pen-close';
            default: return 'cursor-pen';
        }
    }
);
