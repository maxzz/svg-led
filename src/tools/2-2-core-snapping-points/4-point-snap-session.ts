import { type Getter, type Setter } from "jotai";
import { appSettings } from "@/store/1-ui-settings";

import { type Point } from "@/svg-core";
import { type SnapAxis, snapThreshold } from "@/tools/2-1-core-snapping";
import { type PointTarget, nearestPoint, snapPoint } from "./1-point-snap-engine";
import { type PointSnapExclude, collectPointTargets } from "./2-point-snap-targets";
import { clearPointSnapAtom, setPointSnapAtom } from "./a-point-snap-atoms";

/** Snap targets of one drag, collected when it starts (the targets do not move while it lasts) */
export type PointSnapSession = { targets: PointTarget[]; };

export function beginPointSnap(get: Getter, exclude: PointSnapExclude): PointSnapSession {
    return { targets: collectPointTargets(get, exclude) };
}

export type PointSnapDragOptions = {
    axes?: readonly SnapAxis[];    // free axes of a constrained drag; both by default
};

const BOTH_AXES: readonly SnapAxis[] = ['x', 'y'];

/**
 * Snaps the dragged point `p` (document coordinates) and shows its smart guides; returns where the point goes.
 * Only the Smart guides preference turns this on: Ctrl belongs to the Pen's spring-loaded Direct selection.
 */
export function updatePointSnap(set: Setter, session: PointSnapSession, p: Point, opts: PointSnapDragOptions = {}): Point {
    const axes = opts.axes ?? BOTH_AXES;
    if (!axes.length || !appSettings.prefs.smartGuides) {
        set(clearPointSnapAtom);
        return p;
    }
    const result = snapPoint(p, session.targets, { threshold: snapThreshold(), axes });
    set(setPointSnapAtom, result);
    return result.point;
}

/**
 * Like `updatePointSnap`, for a point dragged on a grid. `raw` is where the pointer really is and `gridded`
 * is the same point after grid snapping. A target point within reach of the pointer wins outright, so the
 * point lands exactly on it (not on the grid). Otherwise the grid point gets the usual guide snapping.
 */
export function updatePointSnapOverGrid(set: Setter, session: PointSnapSession, raw: Point, gridded: Point, opts: PointSnapDragOptions = {}): Point {
    const axes = opts.axes ?? BOTH_AXES;
    if (axes.length === 2 && appSettings.prefs.smartGuides) {
        const hit = nearestPoint(raw, session.targets, snapThreshold());
        if (hit) {
            const point = { x: hit.x, y: hit.y };
            set(setPointSnapAtom, { point, snapped: true, guides: [], marks: [point] });
            return point;
        }
    }
    return updatePointSnap(set, session, gridded, opts);
}

export function endPointSnap(set: Setter): void {
    set(clearPointSnapAtom);
}
