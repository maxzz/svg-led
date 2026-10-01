import { type Point, translateMatrix } from "@/svg-core";
import { type NodeOriginals, applyDocMatrix, captureOriginals, commitHistory } from "@/store/3-document";
import { type ToolPointerEvent } from "../1-types";
import { snapValue } from "./2-tool-helpers";

/** Dragging whole elements; used by the select tool and by points mode when an element body is dragged */
export type MoveGesture = {
    startDoc: Point;
    startScreen: Point;
    originals: NodeOriginals;
    moved: boolean;
    forceCommit: boolean;        // commit even without movement (e.g. Alt+click created copies)
};

export const DRAG_THRESHOLD_PX = 3;

export function beginMove(ids: readonly string[], e: ToolPointerEvent, forceCommit = false): MoveGesture {
    return { startDoc: e.doc, startScreen: e.screen, originals: captureOriginals(ids), moved: false, forceCommit };
}

export function updateMove(g: MoveGesture, e: ToolPointerEvent, constrainAxis: boolean): void {
    if (!g.moved && Math.hypot(e.screen.x - g.startScreen.x, e.screen.y - g.startScreen.y) < DRAG_THRESHOLD_PX) {
        return;
    }
    g.moved = true;

    let dx = snapValue(e.doc.x - g.startDoc.x);
    let dy = snapValue(e.doc.y - g.startDoc.y);
    if (constrainAxis) {
        Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
    }
    applyDocMatrix(g.originals, translateMatrix(dx, dy));
}

export function endMove(g: MoveGesture): void {
    if (g.moved || g.forceCommit) {
        commitHistory();
    }
}

export function pastThreshold(a: Point, b: Point): boolean {
    return Math.hypot(b.x - a.x, b.y - a.y) >= DRAG_THRESHOLD_PX;
}
