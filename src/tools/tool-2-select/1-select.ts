import { snapshot } from "valtio";
import { type Getter, type Setter, atom } from "jotai";
import { MousePointer2 } from "lucide-react";

import { type ResizeHandle, type ToolDef, type ToolPointerEvent } from "../9-types-tool-def";
import { type Point, type Rect, type SvgDoc, applyMatrix, findNode, flattenSubpaths, groupPathIds, nodeCtm, nodeOutline, rectContainsRect, rectFromCorners, rectsIntersect, scaleAround, walkNodes } from "@/svg-core";
import { type NodeOriginals, applyDocMatrix, captureOriginals, commitHistory, docState, duplicateNodes, nodeDocBBox, nodesDocBBox } from "@/store/3-document";
import { ToolId, editingGroupIdAtom, hoverNodeIdAtom, lassoAtom, marqueeAtom, screenToDoc, selectionAtom, setActiveToolAtom, setSelectionAtom, viewportAtom } from "@/store/4-editor";
import { appSettings, SelectionMode } from "@/store/1-ui-settings";
import { selectionMove, selectionPointer, selectionPointerHover } from "@/ui/cursors/tailwind-cursors";

import { MODIFIERS, isMod } from "./8-definition-of-modifiers";
import { modifierHint } from "../0-shared/5-hint";
import { type MoveGesture, beginMove, endMove, pastThreshold, updateMove } from "../0-shared/3-move-gesture";
import { hitTestOutlines, docTolerance } from "../0-shared/2-tool-helpers";
import { selectedGroupOnPath, selectionUnitId } from "../0-shared/4-group-units";
import { clearSnapGuides, collectSnapTargets, setSnapGuides, snapActive, snapBox, snapThreshold } from "../core-snapping";
import { LASSO_STEP_PX, type Polyline, lassoHits, simplifyLasso } from "./2-lasso";

/** True while a move gesture drags the selection. The hover state is cleared on pointer down, so the cursor needs this to keep the move icon during the drag. */
const movingSelectionAtom = atom(false);

export const selectTool: ToolDef = {
    id: ToolId.select,
    label: 'Selection',
    shortcut: 'v',
    altShortcut: '1',
    icon: MousePointer2,
    hint: ({ held, dragging }) => dragging
        ? '' //'Release to finish'
        : modifierHint(held, 'Click to select, drag to move · [Shift] add · [Alt] copy or lasso · [Ctrl] inside group', {
            shift: '[Shift] Click to add or remove · Drag along one axis',
            alt: '[Alt] Drag an element to copy · on empty canvas, [Alt] drag to lasso',
            ctrl: '[Ctrl] Click to select inside a group · Drag snaps to other elements',
        }),
    cursor: selectionPointer,
    getCursor(get) {
        if (get(movingSelectionAtom)) {
            return selectionMove; // dragging the selection
        }
        const hover = get(hoverNodeIdAtom);
        if (!hover) {
            return selectionPointer; // not over any object
        }
        return get(selectionAtom).includes(hover)
            ? selectionMove // over a selected object
            : selectionPointerHover; // over an object that is not selected yet
    },

    onPointerDown({ get, set }, e) {
        const selection = get(selectionAtom);
        let target = e.target;

        if (target.type === 'resize' && selection.length) {
            const bbox = nodesDocBBox(snapshot(docState).doc as SvgDoc, selection);
            if (bbox) {
                gesture = {
                    type: 'resize', originals: captureOriginals(selection), bbox, handle: target.handle, moved: false, startScreen: e.screen,
                    snapTargets: collectSnapTargets(docState.doc as SvgDoc, selection),
                };
            }
            return;
        }

        if (target.type === 'none') {
            const hit = hitTestOutlines(e.doc, docTolerance(get, 4));
            if (hit) {
                target = { type: 'node', ...hit };
            }
        }

        if (target.type === 'node' && e.clickCount >= 2) {
            // Double-click on an element of a selected group enters that group; otherwise the element's points are edited
            const group = selectedGroupOnPath(docState.doc, target.leafId, selection);
            set(setSelectionAtom, [target.leafId]);
            if (group) {
                set(editingGroupIdAtom, group);
            } else {
                set(setActiveToolAtom, ToolId.points);
            }
            return;
        }

        if (target.type === 'node' || target.type === 'anchor' || target.type === 'shape-handle' || target.type === 'handle') {
            let id: string;
            if (target.type !== 'node') {
                id = target.nodeId;
            } else if (isMod(e, M.deepSelect)) {
                // Ctrl+click selects the element itself and edits its innermost group
                const path = groupPathIds(docState.doc, target.leafId);
                set(editingGroupIdAtom, path.length ? path[path.length - 1] : null);
                id = target.leafId;
            } else {
                // A click outside the group being edited ends editing; otherwise the unit is a child of that group
                const editing = get(editingGroupIdAtom);
                if (editing && !groupPathIds(docState.doc, target.leafId).includes(editing)) {
                    set(editingGroupIdAtom, null);
                }
                id = selectionUnitId(docState.doc, target.leafId, get(editingGroupIdAtom));
            }

            let ids = selection;
            if (isMod(e, M.toggleSelection)) {
                if (selection.includes(id)) {
                    set(selectionAtom, selection.filter((s) => s !== id));
                    return;
                }
                ids = [...selection, id];
            } else if (!selection.includes(id)) {
                ids = [id];
            }

            const duplicate = isMod(e, M.duplicateDrag);
            if (duplicate) {
                ids = duplicateNodes(ids);
            }
            set(selectionAtom, ids);
            set(movingSelectionAtom, true);
            gesture = { type: 'move', move: beginMove(ids, e, duplicate) };
            return;
        }

        // empty canvas: rubber band, or a lasso while Alt is held
        const additive = isMod(e, M.toggleSelection);
        if (!additive) {
            set(editingGroupIdAtom, null);
            set(setSelectionAtom, []);
        }
        const doc = snapshot(docState).doc as SvgDoc;
        const bboxes = new Map<string, Rect>();
        for (const node of doc.children) {
            const b = nodeDocBBox(doc, node.id);
            b && bboxes.set(node.id, b);
        }
        const origin = e.screen;
        gesture = {
            type: 'marquee', origin, startScreen: origin, base: additive ? selection : [], bboxes, doc,
            trail: isMod(e, M.lassoSelect) ? [origin] : null,
            picks: [], outlines: new Map(),
        };
    },

    onPointerMove({ get, set }, e) {
        if (!gesture) {
            return;
        }
        switch (gesture.type) {
            case 'move':
                updateMove(gesture.move, e, isMod(e, M.constrainAxis), isMod(e, M.snapToObjects));
                break;
            case 'marquee':
                updateArea(get, set, gesture, e);
                break;
            case 'resize':
                if (!gesture.moved && !pastThreshold(gesture.startScreen, e.screen)) {
                    return;
                }
                gesture.moved = true;
                // the dragged point snaps to edges and centers of other elements, only along the axes the handle moves
                let point = e.doc;
                if (snapActive(isMod(e, M.snapToObjects))) {
                    const { dirX, dirY } = handleDirs(gesture.handle);
                    const axes: ('x' | 'y')[] = [...(dirX ? ['x' as const] : []), ...(dirY ? ['y' as const] : [])];
                    const off = snapBox({ x: e.doc.x, y: e.doc.y, width: 0, height: 0 }, gesture.snapTargets, { threshold: snapThreshold(), spacing: false, axes });
                    point = { x: e.doc.x + off.dx, y: e.doc.y + off.dy };
                    setSnapGuides(off.guides);
                } else {
                    clearSnapGuides();
                }
                applyDocMatrix(gesture.originals, resizeMatrix(gesture.bbox, gesture.handle, { ...e, doc: point }));
                break;
        }
    },

    onPointerUp({ set }) {
        clearSnapGuides();
        set(movingSelectionAtom, false);
        if (!gesture) {
            return;
        }
        switch (gesture.type) {
            case 'move':
                endMove(gesture.move);
                break;
            case 'marquee':
                set(marqueeAtom, null);
                set(lassoAtom, null);
                break;
            case 'resize':
                gesture.moved && commitHistory();
                break;
        }
        gesture = null;
    },
};

//---------------------------------------------------------------------------

const M = MODIFIERS.select;

type Gesture =
    | { type: 'move'; move: MoveGesture; }
    | AreaGesture
    | { type: 'resize'; originals: NodeOriginals; bbox: Rect; handle: ResizeHandle; moved: boolean; startScreen: Point; snapTargets: Rect[]; };

/**
 * Drag on empty canvas: a rubber band, or a lasso while `trail` is set. Both start from `origin`.
 * `startScreen` is the rubber band corner, which moves when the drag leaves the lasso. `base` is the selection
 * kept from before the drag (and from the lasso picks when the drag leaves it); `picks` is what the current shape selects.
 */
type AreaGesture = {
    type: 'marquee';
    origin: Point;
    startScreen: Point;
    base: string[];
    bboxes: Map<string, Rect>;
    doc: SvgDoc;
    trail: Point[] | null;              // lasso points in screen coordinates; null while the rubber band is active
    picks: string[];
    outlines: Map<string, Polyline[]>;  // document-space outlines, computed when the lasso first reaches an element
};

let gesture: Gesture | null = null;

//---------------------------------------------------------------------------

/**
 * Updates a rubber band or lasso drag. Holding Alt (or releasing it) switches between them for as long as the drag lasts,
 * and the selection carries over, as in Excalidraw.
 */
function updateArea(get: Getter, set: Setter, g: AreaGesture, e: ToolPointerEvent) {
    const lasso = isMod(e, M.lassoSelect);
    if (lasso !== (g.trail !== null)) {
        if (g.trail) {
            // leaving the lasso: what it selected stays selected, and the rubber band starts from the pointer
            g.base = [...new Set([...g.base, ...g.picks])];
            g.startScreen = e.screen;
            g.trail = null;
        } else {
            // entering the lasso: it draws again from the drag origin, so the rubber band's picks are dropped
            g.trail = [g.origin];
        }
        g.picks = [];
    }

    // Ctrl flips the configured mode for as long as it is held
    const mode = isMod(e, M.invertSelectionMode)
        ? (appSettings.prefs.selectionMode === SelectionMode.inclusive ? SelectionMode.exclusive : SelectionMode.inclusive)
        : appSettings.prefs.selectionMode;
    const inclusive = mode === SelectionMode.inclusive;

    if (g.trail) {
        const last = g.trail[g.trail.length - 1];
        if (Math.hypot(e.screen.x - last.x, e.screen.y - last.y) >= LASSO_STEP_PX) {
            g.trail.push(e.screen);
        }

        const vp = get(viewportAtom);
        const docPath = g.trail.map((p) => screenToDoc(vp, p));
        const polygon = simplifyLasso(docPath, docTolerance(get, 1));
        g.picks = lassoHits(polygon, g.bboxes, (id) => {
            let lines = g.outlines.get(id);
            if (!lines) {
                lines = elementPolylines(g.doc, id);
                g.outlines.set(id, lines);
            }
            return lines;
        }, inclusive);

        set(lassoAtom, [...g.trail]);
        set(marqueeAtom, null);
    } else {
        set(marqueeAtom, rectFromCorners(g.startScreen, e.screen));
        set(lassoAtom, null);

        const vp = get(viewportAtom);
        const docRect = rectFromCorners(screenToDoc(vp, g.startScreen), e.doc);
        const inside = inclusive
            ? (b: Rect) => rectContainsRect(docRect, b)
            : (b: Rect) => rectsIntersect(b, docRect);
        g.picks = [...g.bboxes].filter(([, b]) => inside(b)).map(([id]) => id);
    }

    set(selectionAtom, [...new Set([...g.base, ...g.picks])]);
}

/**
 * Document-space polylines of one top-level element. Paths and shapes contribute their flattened outline;
 * elements without outline geometry (text, images, ...) contribute the outline of their bounding box.
 * Groups have no geometry of their own, so their members are walked instead.
 */
function elementPolylines(doc: SvgDoc, topId: string): Polyline[] {
    const top = doc.children.find((node) => node.id === topId);
    if (!top) {
        return [];
    }

    const lines: Polyline[] = [];
    walkNodes([top], (node) => {
        if (node.kind === 'g') {
            return;
        }

        const loc = findNode(doc, node.id);
        const outline = nodeOutline(node);
        const polys = loc && outline ? flattenSubpaths(outline) : [];
        if (loc && polys.length) {
            const ctm = nodeCtm(loc);
            for (const poly of polys) {
                lines.push(poly.map((p) => applyMatrix(ctm, p)));
            }
            return;
        }

        const box = nodeDocBBox(doc, node.id);
        if (box) {
            const { x, y, width, height } = box;
            lines.push([{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }, { x, y }]);
        }
    });
    return lines;
}

//---------------------------------------------------------------------------

/** Which axes a handle moves: -1 for its left/top side, 1 for its right/bottom side, 0 when the axis is not resized */
function handleDirs(handle: ResizeHandle) {
    return {
        dirX: handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0,
        dirY: handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0,
    };
}

/**
 * Scale of one axis. The dragged side follows the pointer; the opposite side stays fixed,
 * or the center of the box is fixed when Alt is held. An axis that is not resized gets scale 1.
 */
function axisScale(pointer: number, start: number, size: number, dir: number, fromCenter: boolean) {
    if (!dir) {
        return { scale: 1, origin: start };
    }
    const side = dir < 0 ? start : start + size;
    const origin = fromCenter ? start + size / 2 : dir < 0 ? start + size : start;
    const span = side - origin;
    return { scale: span ? (pointer - origin) / span : 1, origin };
}

/**
 * Corners scale both axes (Shift keeps the aspect ratio); edge handles scale only the axis perpendicular to their edge,
 * so Shift has no effect on them.
 */
function resizeMatrix(bbox: Rect, handle: ResizeHandle, e: ToolPointerEvent) {
    const fromCenter = isMod(e, M.resizeFromCenter);
    const keepAspect = isMod(e, M.resizeKeepAspect);
    const { dirX, dirY } = handleDirs(handle);

    const x = axisScale(e.doc.x, bbox.x, bbox.width, dirX, fromCenter);
    const y = axisScale(e.doc.y, bbox.y, bbox.height, dirY, fromCenter);
    let sx = x.scale;
    let sy = y.scale;
    if (keepAspect && dirX && dirY) {
        const s = Math.max(Math.abs(sx), Math.abs(sy));
        sx = Math.sign(sx || 1) * s;
        sy = Math.sign(sy || 1) * s;
    }
    if (Math.abs(sx) < 1e-6) sx = 1e-6;
    if (Math.abs(sy) < 1e-6) sy = 1e-6;
    return scaleAround(sx, sy, { x: x.origin, y: y.origin });
}

//---------------------------------------------------------------------------
