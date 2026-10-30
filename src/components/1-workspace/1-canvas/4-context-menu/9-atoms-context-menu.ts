import { type MouseEvent as ReactMouseEvent } from "react";
import { atom } from "jotai";
import { docState } from "@/store/3-document";
import { ToolId, activeToolIdAtom, nodeAnchorKey, selectedAnchorsAtom, selectionAtom } from "@/store/4-editor";
import { filterTarget, getIsolatedId } from "@/store/6-layers";
import { resolveTarget } from "@/tools";

/** Which menu opens: the canvas itself, the selected elements, or the anchors of the path being edited */
export type CanvasMenuKind = 'canvas' | 'elements' | 'points';

export const canvasMenuKindAtom = atom<CanvasMenuKind>('canvas');

/**
 * Right-click on the canvas. The selection stays as it is: the menu is for whatever is already selected,
 * even when the pointer is over a different element. Runs before Radix opens the menu, so the menu renders
 * with the new kind.
 */
export const openCanvasMenuAtom = atom(
    null,
    (get, set, e: ReactMouseEvent<SVGSVGElement>) => {
        if (get(activeToolIdAtom) === ToolId.points) {
            const target = filterTarget(docState.doc, resolveTarget(e.target as Element), getIsolatedId(get));
            if (target.type === 'anchor' || target.type === 'shape-handle') {
                const full = nodeAnchorKey(target.nodeId, target.type === 'anchor' ? target.key : `h:${target.key}`);
                if (!get(selectedAnchorsAtom).includes(full)) {
                    set(selectedAnchorsAtom, [full]);
                }
            }
            set(canvasMenuKindAtom, 'points');
            return;
        }

        set(canvasMenuKindAtom, get(selectionAtom).length > 0 ? 'elements' : 'canvas');
    }
);
