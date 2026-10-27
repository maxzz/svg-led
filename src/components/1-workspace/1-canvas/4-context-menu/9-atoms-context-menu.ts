import { type MouseEvent as ReactMouseEvent } from "react";
import { atom } from "jotai";
import { snapshot } from "valtio";
import { type SvgDoc, rectContainsPoint } from "@/svg-core";
import { docState, nodesDocBBox } from "@/store/3-document";
import {
    ToolId, activeToolIdAtom, nodeAnchorKey, screenToDoc, selectedAnchorsAtom, selectionAtom, setSelectionAtom,
    viewportAtom,
} from "@/store/4-editor";
import { filterTarget, getIsolatedId } from "@/store/6-layers";
import { resolveTarget, selectionUnitId } from "@/tools";
import { docTolerance, hitTestOutlines } from "@/tools/0-shared/2-tool-helpers";

/** Which menu opens: the canvas itself, the selected elements, or the anchors of the path being edited */
export type CanvasMenuKind = 'canvas' | 'elements' | 'points';

export const canvasMenuKindAtom = atom<CanvasMenuKind>('canvas');

/**
 * Right-click on the canvas. Decides the menu kind from what is under the pointer, selects the element under it
 * (like Excalidraw), and keeps the selection when the pointer is on empty canvas.
 * Runs before Radix opens the menu, so the menu renders with the new kind.
 */
export const openCanvasMenuAtom = atom(
    null,
    (get, set, e: ReactMouseEvent<SVGSVGElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const p = screenToDoc(get(viewportAtom), { x: e.clientX - r.left, y: e.clientY - r.top });
        const isolatedId = getIsolatedId(get);
        const target = filterTarget(docState.doc, resolveTarget(e.target as Element), isolatedId);

        if (get(activeToolIdAtom) === ToolId.points) {
            if (target.type === 'anchor' || target.type === 'shape-handle') {
                const full = nodeAnchorKey(target.nodeId, target.type === 'anchor' ? target.key : `h:${target.key}`);
                if (!get(selectedAnchorsAtom).includes(full)) {
                    set(selectedAnchorsAtom, [full]);
                }
            }
            set(canvasMenuKindAtom, 'points');
            return;
        }

        let leafId: string | undefined;
        switch (target.type) {
            case 'node':
                leafId = target.leafId;
                break;
            case 'anchor':
            case 'handle':
            case 'shape-handle':
                leafId = target.nodeId;
                break;
            case 'none':
                leafId = hitTestOutlines(p, docTolerance(get, 4), isolatedId)?.leafId; // thin strokes are hard to hit
                break;
        }

        const selection = get(selectionAtom);
        if (leafId) {
            const unit = selectionUnitId(docState.doc, leafId, isolatedId);
            if (!selection.includes(unit)) {
                set(setSelectionAtom, [unit]);
            }
            set(canvasMenuKindAtom, 'elements');
            return;
        }

        // Empty canvas inside the bbox of the selection still counts as the selection (Excalidraw does the same)
        const bbox = selection.length ? nodesDocBBox(snapshot(docState).doc as SvgDoc, selection) : null;
        const onSelection = target.type === 'resize' || (!!bbox && rectContainsPoint(bbox, p));
        set(canvasMenuKindAtom, onSelection ? 'elements' : 'canvas');
    }
);
