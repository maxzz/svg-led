import { atom } from "jotai";
import { type Point } from "@/svg-core";
import { docToScreen, viewportAtom } from "@/store/4-editor";
import { type PointSnapResult } from "./1-point-snap-engine";

/** Smart guides of the point being dragged, in document coordinates; null when it is not snapped */
const pointSnapAtom = atom<Pick<PointSnapResult, 'guides' | 'marks'> | null>(null);

/** Shows the guides of a snap result, or hides them when the point did not snap */
export const setPointSnapAtom = atom(
    null,
    (get, set, result: PointSnapResult) => {
        if (result.snapped) {
            set(pointSnapAtom, { guides: result.guides, marks: result.marks });
        } else if (get(pointSnapAtom)) {
            set(pointSnapAtom, null);
        }
    }
);

export const clearPointSnapAtom = atom(
    null,
    (get, set) => {
        get(pointSnapAtom) && set(pointSnapAtom, null);
    }
);

/** Screen pixels a guide runs past its ends, so short guides stay visible */
const GUIDE_OVERSHOOT = 8;

export type ScreenGuide = { a: Point; b: Point; };

/** Guides and cross marks in screen space for the overlay; follows zoom and pan while dragging */
export const pointSnapScreenAtom = atom<{ guides: ScreenGuide[]; marks: Point[]; } | null>(
    (get) => {
        const snap = get(pointSnapAtom);
        if (!snap) {
            return null;
        }
        const vp = get(viewportAtom);
        return {
            guides: snap.guides.map((g) => extend(docToScreen(vp, { x: g.x1, y: g.y1 }), docToScreen(vp, { x: g.x2, y: g.y2 }))),
            marks: snap.marks.map((m) => docToScreen(vp, m)),
        };
    }
);

function extend(a: Point, b: Point): ScreenGuide {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) {
        return { a, b };
    }
    const ux = (b.x - a.x) / len * GUIDE_OVERSHOOT;
    const uy = (b.y - a.y) / len * GUIDE_OVERSHOOT;
    return { a: { x: a.x - ux, y: a.y - uy }, b: { x: b.x + ux, y: b.y + uy } };
}
