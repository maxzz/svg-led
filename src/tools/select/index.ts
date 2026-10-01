import { MousePointer2 } from "lucide-react";
import { snapshot } from "valtio";
import { type Point, type Rect, type SvgDoc, rectFromCorners, rectsIntersect, scaleAround } from "@/svg-core";
import { type NodeOriginals, applyDocMatrix, captureOriginals, commitHistory, docState, duplicateNodes, nodeDocBBox, nodesDocBBox } from "@/store/3-document";
import { ToolId, marqueeAtom, screenToDoc, selectionAtom, setActiveToolAtom, setSelectionAtom, viewportAtom } from "@/store/4-editor";
import { type ToolDef, type ToolPointerEvent } from "../1-types";
import { MODIFIERS, isMod } from "../3-modifiers";
import { type MoveGesture, beginMove, endMove, pastThreshold, updateMove } from "../0-shared/3-move-gesture";
import { hitTestOutlines, docTolerance } from "../0-shared/2-tool-helpers";

const M = MODIFIERS.select;

type Gesture =
    | { type: 'move'; move: MoveGesture; }
    | { type: 'marquee'; startScreen: Point; base: string[]; bboxes: Map<string, Rect>; }
    | { type: 'resize'; originals: NodeOriginals; bbox: Rect; corner: 'nw' | 'ne' | 'se' | 'sw'; moved: boolean; startScreen: Point; };

let gesture: Gesture | null = null;

export const selectTool: ToolDef = {
    id: ToolId.select,
    label: 'Selection',
    shortcut: 'v',
    icon: MousePointer2,
    hint: 'Click to select, Shift+click to add, drag to move (Alt+drag copies), double-click to edit points',
    cursor: 'default',

    onPointerDown({ get, set }, e) {
        const selection = get(selectionAtom);
        let target = e.target;

        if (target.type === 'resize' && selection.length) {
            const bbox = nodesDocBBox(snapshot(docState).doc as SvgDoc, selection);
            if (bbox) {
                gesture = { type: 'resize', originals: captureOriginals(selection), bbox, corner: target.corner, moved: false, startScreen: e.screen };
            }
            return;
        }

        if (target.type === 'none') {
            const hit = hitTestOutlines(e.doc, docTolerance(get, 4));
            if (hit) {
                target = { type: 'node', ...hit };
            }
        }

        if (target.type === 'node' || target.type === 'anchor' || target.type === 'shape-handle' || target.type === 'handle') {
            const id = target.type === 'node' ? target.topId : target.nodeId;

            if (e.clickCount >= 2 && target.type === 'node') {
                set(setSelectionAtom, [target.leafId]);
                set(setActiveToolAtom, ToolId.points);
                return;
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
                updateMove(gesture.move, e, isMod(e, M.constrainAxis));
                break;
            case 'marquee': {
                const screenRect = rectFromCorners(gesture.startScreen, e.screen);
                set(marqueeAtom, screenRect);
                const vp = get(viewportAtom);
                const a = screenToDoc(vp, gesture.startScreen);
                const docRect = rectFromCorners(a, e.doc);
                const hits = [...gesture.bboxes].filter(([, b]) => rectsIntersect(b, docRect)).map(([id]) => id);
                set(selectionAtom, [...new Set([...gesture.base, ...hits])]);
                break;
            }
            case 'resize':
                if (!gesture.moved && !pastThreshold(gesture.startScreen, e.screen)) {
                    return;
                }
                gesture.moved = true;
                applyDocMatrix(gesture.originals, resizeMatrix(gesture.bbox, gesture.corner, e));
                break;
        }
    },

    onPointerUp({ set }) {
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

function resizeMatrix(bbox: Rect, corner: 'nw' | 'ne' | 'se' | 'sw', e: ToolPointerEvent) {
    const fromCenter = isMod(e, M.resizeFromCenter);
    const keepAspect = isMod(e, M.resizeKeepAspect);

    const handle = {
        x: corner.includes('w') ? bbox.x : bbox.x + bbox.width,
        y: corner.includes('n') ? bbox.y : bbox.y + bbox.height,
    };
    const origin = fromCenter
        ? { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }
        : { x: corner.includes('w') ? bbox.x + bbox.width : bbox.x, y: corner.includes('n') ? bbox.y + bbox.height : bbox.y };

    const dx = handle.x - origin.x;
    const dy = handle.y - origin.y;
    let sx = dx ? (e.doc.x - origin.x) / dx : 1;
    let sy = dy ? (e.doc.y - origin.y) / dy : 1;
    if (keepAspect) {
        const s = Math.max(Math.abs(sx), Math.abs(sy));
        sx = Math.sign(sx || 1) * s;
        sy = Math.sign(sy || 1) * s;
    }
    if (Math.abs(sx) < 1e-6) sx = 1e-6;
    if (Math.abs(sy) < 1e-6) sy = 1e-6;
    return scaleAround(sx, sy, origin);
}
