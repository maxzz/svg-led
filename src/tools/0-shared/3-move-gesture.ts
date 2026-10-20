import { type Point, type Rect, type SvgDoc, translateMatrix } from "@/svg-core";
import { type NodeOriginals, applyDocMatrix, captureOriginals, commitHistory, docState, nodesDocBBox } from "@/store/3-document";
import { type ToolPointerEvent } from "../1-types";
import { snapValue } from "./2-tool-helpers";
import { type SnapAxis, clearSnapGuides, collectSnapTargets, setSnapGuides, snapActive, snapBox, snapThreshold } from "@/tools/core-snapping";

/** Dragging whole elements; used by the select tool and by points mode when an element body is dragged */
export type MoveGesture = {
    startDoc: Point;
    startScreen: Point;
    originals: NodeOriginals;
    moved: boolean;
    forceCommit: boolean;        // commit even without movement (e.g. Alt+click created copies)
    startBox: Rect | null;       // bbox of the dragged elements when the drag began
    snapTargets: Rect[];         // bboxes of everything else, for "Snap to objects"
};

export const DRAG_THRESHOLD_PX = 3;

export function beginMove(ids: readonly string[], e: ToolPointerEvent, forceCommit = false): MoveGesture {
    const doc = docState.doc as SvgDoc;
    return {
        startDoc: e.doc,
        startScreen: e.screen,
        originals: captureOriginals(ids),
        moved: false,
        forceCommit,
        startBox: nodesDocBBox(doc, ids),
        snapTargets: collectSnapTargets(doc, ids),
    };
}

/**
 * `snapKey` is the snap modifier (Ctrl) held on this event. Grid snapping runs first;
 * object snapping then adjusts the offset on the axes where an edge or center lines up.
 */
export function updateMove(g: MoveGesture, e: ToolPointerEvent, constrainAxis: boolean, snapKey: boolean): void {
    if (!g.moved && Math.hypot(e.screen.x - g.startScreen.x, e.screen.y - g.startScreen.y) < DRAG_THRESHOLD_PX) {
        return;
    }
    g.moved = true;

    let dx = snapValue(e.doc.x - g.startDoc.x);
    let dy = snapValue(e.doc.y - g.startDoc.y);
    let axes: SnapAxis[] = ['x', 'y'];
    if (constrainAxis) {
        if (Math.abs(dx) > Math.abs(dy)) {
            dy = 0;
            axes = ['x'];
        } else {
            dx = 0;
            axes = ['y'];
        }
    }

    if (g.startBox && snapActive(snapKey)) {
        const box = { ...g.startBox, x: g.startBox.x + dx, y: g.startBox.y + dy };
        const off = snapBox(box, g.snapTargets, { threshold: snapThreshold(), spacing: true, axes });
        dx += off.dx;
        dy += off.dy;
        setSnapGuides(off.guides);
    } else {
        clearSnapGuides();
    }

    applyDocMatrix(g.originals, translateMatrix(dx, dy));
}

export function endMove(g: MoveGesture): void {
    clearSnapGuides();
    if (g.moved || g.forceCommit) {
        commitHistory();
    }
}

export function pastThreshold(a: Point, b: Point): boolean {
    return Math.hypot(b.x - a.x, b.y - a.y) >= DRAG_THRESHOLD_PX;
}
