import { type Point, type Rect, type SvgDoc, translateMatrix } from "@/svg-core";
import { type NodeOriginals, applyDocMatrix, captureOriginals, commitHistory, docState, nodesDocBBox } from "@/store/3-document";
import { type ToolPointerEvent } from "../9-types-tool-def";
import { altDisablesSnap } from "./3-move-alt-snap";
import { snapValue } from "./2-tool-helpers";
import { type SnapAxis, clearSnapGuides, collectSnapTargets, setSnapGuides, snapActive, snapBox, snapThreshold } from "@/tools/core-snapping";

/** Dragging whole elements; used by the select tool and by points mode when an element body is dragged */
export type MoveGesture = {
    startDoc: Point;
    startScreen: Point;
    originals: NodeOriginals;
    moved: boolean;
    forceCommit: boolean;        // commit even without movement (e.g. Alt+click created copies)
    /**
     * Alt was held to make the copy, so that press does not turn snapping off.
     * It clears when Alt is released; the next press disables snapping.
     */
    duplicateAlt: boolean;
    lastEvent: ToolPointerEvent | null;
    startBox: Rect | null;       // bbox of the dragged elements when the drag began
    snapTargets: Rect[];         // bboxes of everything else, for "Snap to objects"
};

export function beginMove(ids: readonly string[], e: ToolPointerEvent, forceCommit = false): MoveGesture {
    const doc = docState.doc as SvgDoc;
    return {
        startDoc: e.doc,
        startScreen: e.screen,
        originals: captureOriginals(ids),
        moved: false,
        forceCommit,
        duplicateAlt: forceCommit,
        lastEvent: null,
        startBox: nodesDocBBox(doc, ids),
        snapTargets: collectSnapTargets(doc, ids),
    };
}

/**
 * `snapKey` is the snap modifier (Ctrl) held on this event. Grid snapping runs first;
 * object snapping then adjusts the offset on the axes where an edge or center lines up.
 * Alt turns both off until it is released. The Alt that created a copy does not, until it is released and pressed again.
 */
export function updateMove(g: MoveGesture, e: ToolPointerEvent, constrainAxis: boolean, snapKey: boolean): void {
    g.lastEvent = e;
    if (!g.moved && Math.hypot(e.screen.x - g.startScreen.x, e.screen.y - g.startScreen.y) < DRAG_THRESHOLD_PX) {
        // Releasing Alt before the drag starts still ends the copy-key press, so the next press can turn snapping off
        if (!e.alt) {
            g.duplicateAlt = false;
        }
        return;
    }
    g.moved = true;

    const alt = altDisablesSnap(g.duplicateAlt, e.alt);
    g.duplicateAlt = alt.duplicateAlt;

    let dx = e.doc.x - g.startDoc.x;
    let dy = e.doc.y - g.startDoc.y;
    if (!alt.disable) {
        dx = snapValue(dx);
        dy = snapValue(dy);
    }
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

    if (!alt.disable && g.startBox && snapActive(snapKey)) {
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

/**
 * Alt pressed or released during a move, so the drag follows the key without waiting for the next pointer move.
 * Returns true when the key was Alt.
 */
export function moveAltKey(g: MoveGesture, key: KeyboardEvent, down: boolean, snapKey: boolean): boolean {
    if (key.key !== 'Alt' || key.repeat) {
        return false;
    }
    if (down) {
        if (g.duplicateAlt || !g.lastEvent || !g.moved) {
            return true;
        }
        updateMove(g, pointerWithKeys(g.lastEvent, key, true), key.shiftKey, snapKey);
        return true;
    }
    const wasCopyKey = g.duplicateAlt;
    g.duplicateAlt = false;
    if (wasCopyKey || !g.lastEvent || !g.moved) {
        return true;
    }
    updateMove(g, pointerWithKeys(g.lastEvent, key, false), key.shiftKey, snapKey);
    return true;
}

function pointerWithKeys(e: ToolPointerEvent, key: KeyboardEvent, alt: boolean): ToolPointerEvent {
    return { ...e, alt, shift: key.shiftKey, ctrl: key.ctrlKey || key.metaKey };
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

export const DRAG_THRESHOLD_PX = 3;