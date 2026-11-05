import { atom } from "jotai";
import { heldKeysAtom, toolGestureActiveAtom } from "@/store/4-editor";
import { MODIFIERS, isMod } from "../tool-2-select/8-definition-of-modifiers";
import { type PenAction, type PenActionType } from "./1-pen-edit-points";

const M = MODIFIERS.pen;

type PenHover = {
    action: PenActionType | null;  // what a plain click would do
    overAnchor: boolean;           // an anchor the convert modifier can toggle or pull handles from
};

/** What a click would do where the pointer hovers; set by the Pen tool on hover, cleared when the pointer leaves */
const penHoverAtom = atom<PenHover>({ action: null, overAnchor: false });

export const setPenHoverAtom = atom(
    null,
    (get, set, hover: { action: PenAction | null; overAnchor: boolean; } | null) => {
        const next = { action: hover?.action?.type ?? null, overAnchor: !!hover?.overAnchor };
        const cur = get(penHoverAtom);
        (cur.action !== next.action || cur.overAnchor !== next.overAnchor) && set(penHoverAtom, next);
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
        const { action, overAnchor } = get(penHoverAtom);
        const held = get(heldKeysAtom);
        if (overAnchor && isMod(held, M.convertAnchor)) {
            return 'cursor-pen-convert';
        }
        const plainOnly = autoAddDeleteOff(held);
        switch (action) {
            case 'add': return plainOnly ? 'cursor-pen' : 'cursor-pen-add';
            case 'delete': return plainOnly ? 'cursor-pen' : 'cursor-pen-delete';
            case 'continue': return 'cursor-pen-continue';
            case 'close': return 'cursor-pen-close';
            default: return 'cursor-pen';
        }
    }
);
