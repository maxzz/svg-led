import { snapshot } from "valtio";
import { MousePointer2 } from "lucide-react";

import { type ResizeHandle, type ToolDef, type ToolPointerEvent } from "../9-types-tool-def";
import { type Point, type Rect, type SvgDoc, groupPathIds, rectContainsRect, rectFromCorners, rectsIntersect, scaleAround } from "@/svg-core";
import { type NodeOriginals, applyDocMatrix, captureOriginals, commitHistory, docState, duplicateNodes, nodeDocBBox, nodesDocBBox } from "@/store/3-document";
import { ToolId, editingGroupIdAtom, marqueeAtom, screenToDoc, selectionAtom, setActiveToolAtom, setSelectionAtom, viewportAtom } from "@/store/4-editor";
import { appSettings, SelectionMode } from "@/store/1-ui-settings";

import { MODIFIERS, isMod } from "./8-definition-of-modifiers";
import { modifierHint } from "../0-shared/5-hint";
import { type MoveGesture, beginMove, endMove, pastThreshold, updateMove } from "../0-shared/3-move-gesture";
import { hitTestOutlines, docTolerance } from "../0-shared/2-tool-helpers";
import { selectedGroupOnPath, selectionUnitId } from "../0-shared/4-group-units";
import { clearSnapGuides, collectSnapTargets, setSnapGuides, snapActive, snapBox, snapThreshold } from "../core-snapping";

export const selectTool: ToolDef = {
    id: ToolId.select,
    label: 'Selection',
    shortcut: 'v',
    altShortcut: '1',
    icon: MousePointer2,
    hint: ({ held, dragging }) => dragging
        ? '' //'Release to finish'
        : modifierHint(held, 'Click to select, drag to move · [Shift] add · [Alt] copy · [Ctrl] inside group', {
            shift: '[Shift] Click to add or remove · Drag along one axis',
            alt: '[Alt] Drag to copy',
            ctrl: '[Ctrl] Click to select inside a group · Drag snaps to other elements',
        }),
    cursor: 'default',

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
            gesture = { type: 'move', move: beginMove(ids, e, duplicate) };
            return;
        }

        // empty canvas: rubber band
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
        gesture = { type: 'marquee', startScreen: e.screen, base: additive ? selection : [], bboxes };
    },

    onPointerMove({ get, set }, e) {
        if (!gesture) {
            return;
        }
        switch (gesture.type) {
            case 'move':
                updateMove(gesture.move, e, isMod(e, M.constrainAxis), isMod(e, M.snapToObjects));
                break;
            case 'marquee': {
                const screenRect = rectFromCorners(gesture.startScreen, e.screen);
                set(marqueeAtom, screenRect);
                const vp = get(viewportAtom);
                const a = screenToDoc(vp, gesture.startScreen);
                const docRect = rectFromCorners(a, e.doc);
                // Ctrl flips the configured mode for as long as it is held
                const mode = isMod(e, M.invertSelectionMode)
                    ? (appSettings.prefs.selectionMode === SelectionMode.inclusive ? SelectionMode.exclusive : SelectionMode.inclusive)
                    : appSettings.prefs.selectionMode;
                const inside = mode === SelectionMode.inclusive
                    ? (b: Rect) => rectContainsRect(docRect, b)
                    : (b: Rect) => rectsIntersect(b, docRect);
                const hits = [...gesture.bboxes].filter(([, b]) => inside(b)).map(([id]) => id);
                set(selectionAtom, [...new Set([...gesture.base, ...hits])]);
                break;
            }
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
        if (!gesture) {
            return;
        }
        switch (gesture.type) {
            case 'move':
                endMove(gesture.move);
                break;
            case 'marquee':
                set(marqueeAtom, null);
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
    | { type: 'marquee'; startScreen: Point; base: string[]; bboxes: Map<string, Rect>; }
    | { type: 'resize'; originals: NodeOriginals; bbox: Rect; handle: ResizeHandle; moved: boolean; startScreen: Point; snapTargets: Rect[]; };

let gesture: Gesture | null = null;

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
