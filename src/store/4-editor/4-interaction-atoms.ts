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
