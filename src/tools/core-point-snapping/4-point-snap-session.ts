import { type Getter, type Setter } from "jotai";
import { appSettings } from "@/store/1-ui-settings";

import { type Point } from "@/svg-core";
import { type SnapAxis, snapThreshold } from "@/tools/core-snapping";
import { type PointTarget, snapPoint } from "./1-point-snap-engine";
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

export function endPointSnap(set: Setter): void {
    set(clearPointSnapAtom);
}
