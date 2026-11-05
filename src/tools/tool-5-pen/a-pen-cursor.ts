import { atom } from "jotai";
import { heldKeysAtom, toolGestureActiveAtom } from "@/store/4-editor";
import { MODIFIERS, isMod } from "../tool-2-select/8-definition-of-modifiers";
import { type PenAction, type PenActionType } from "./1-pen-edit-points";

const M = MODIFIERS.pen;

type PenHover = {
    action: PenActionType | null;  // what a plain click would do
    anchor: { nodeId: string; key: string; } | null; // the anchor under the pointer that the Pen can act on (toggle, pull handles, delete)
};

/** What a click would do where the pointer hovers; set by the Pen tool on hover, cleared when the pointer leaves */
const penHoverAtom = atom<PenHover>({ action: null, anchor: null });

/** The anchor under the pointer in the Pen tool, or null; the overlay grows it like Direct selection does */
export const penHoverAnchorAtom = atom((get) => get(penHoverAtom).anchor);

const sameAnchor = (a: PenHover['anchor'], b: PenHover['anchor']): boolean =>
    a?.nodeId === b?.nodeId && a?.key === b?.key;

export const setPenHoverAtom = atom(
    null,
    (get, set, hover: { action: PenAction | null; anchor: PenHover['anchor']; } | null) => {
        const next: PenHover = { action: hover?.action?.type ?? null, anchor: hover?.anchor ?? null };
        const cur = get(penHoverAtom);
        (cur.action !== next.action || !sameAnchor(cur.anchor, next.anchor)) && set(penHoverAtom, next);
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
        const { action, anchor } = get(penHoverAtom);
        const held = get(heldKeysAtom);
        if (anchor && isMod(held, M.convertAnchor)) {
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
