import { atom } from "jotai";
import { type Point, type Rect, type SubPath } from "@/svg-core";

/** Rubber-band selection in screen coordinates while dragging on empty canvas */
export const marqueeAtom = atom<Rect | null>(null);

/** Space is held: dragging pans the canvas whatever the tool */
export const spaceHeldAtom = atom(false);

/** A pan gesture (hand tool, Space or middle button) is in progress */
export const isPanningAtom = atom(false);

/** Last pointer position over the canvas, in document coordinates */
export const pointerDocAtom = atom<Point | null>(null);

/** Modifier keys held over the editor; Ctrl also covers Cmd */
export type HeldKeys = { shift: boolean; alt: boolean; ctrl: boolean; };

export const NO_HELD_KEYS: HeldKeys = { shift: false, alt: false, ctrl: false };

export function heldKeysOf(e: { shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean; }): HeldKeys {
    return { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
}

/** Held modifier keys, so the hint line shows what they do before the next click */
export const heldKeysAtom = atom<HeldKeys>(NO_HELD_KEYS);

/** Stores the held keys; keeps the current object when nothing changed, so that pressing a key does not re-render the hint */
export const setHeldKeysAtom = atom(
    null,
    (get, set, next: HeldKeys) => {
        const cur = get(heldKeysAtom);
        if (cur.shift !== next.shift || cur.alt !== next.alt || cur.ctrl !== next.ctrl) {
            set(heldKeysAtom, next);
        }
    }
);

/** A pointer gesture of the active tool is in progress (button down on the canvas) */
export const toolGestureActiveAtom = atom(false);

//---------------------------------------------------------------------------

/** Pen tool: the path being drawn */
export type PenDraft = {
    nodeId: string;
    subpaths: SubPath[];         // geometry of the path being drawn, node-local (written to node.d on every change)
    si: number;                  // subpath that is being extended at its end
    isNew: boolean;              // the path was created by this draft (removed if it ends with a single anchor)
    startCount: number;          // anchors in the subpath when the draft started
};

export const penDraftAtom = atom<PenDraft | null>(null);

//---------------------------------------------------------------------------

/** Snap guide shown while dragging (document coordinates) */
export const snapPointAtom = atom<Point | null>(null);
