import { type Getter } from "jotai";
import { appSettings } from "@/store/1-ui-settings";

import { type Matrix, type Point, type SvgNode, applyMatrix, distanceToOutline, fillIsHittable, findNode, invert, matrixScale, nodeCtm, nodeOutline, pointInOutline, walkNodes } from "@/svg-core";
import { docState } from "@/store/3-document";
import { viewportAtom } from "@/store/4-editor";
import { isHidden, isLocked } from "@/store/6-layers";
import { isolationScopeOf } from "./4-group-units";

/** Pixels on screen expressed in document units at the current zoom */
export function docTolerance(get: Getter, px: number): number {
    return px / get(viewportAtom).zoom;
}

export function snapValue(v: number): number {
    const { snapToGrid, gridSize } = appSettings.prefs;
    return snapToGrid && gridSize > 0 ? Math.round(v / gridSize) * gridSize : v;
}

export function snapDoc(p: Point): Point {
    return { x: snapValue(p.x), y: snapValue(p.y) };
}

/** Node-to-document matrix and its inverse */
export function nodeMatrices(id: string): { ctm: Matrix; inv: Matrix; } | undefined {
    const loc = findNode(docState.doc, id);
    if (!loc) {
        return;
    }
    const ctm = nodeCtm(loc);
    return { ctm, inv: invert(ctm) };
}

export function docToLocal(id: string, p: Point): Point {
    const m = nodeMatrices(id);
    return m ? applyMatrix(m.inv, p) : p;
}

//---------------------------------------------------------------------------

/**
 * Geometry hit test for thin strokes that are hard to hit with the pointer:
 * returns the topmost element whose outline passes within `tolerance` (document units).
 * Hidden and locked elements are skipped, and so is everything outside isolation.
 */
export function hitTestOutlines(p: Point, tolerance: number, isolated: string | readonly string[] | null): { topId: string; leafId: string; } | undefined {
    const scope = isolationScopeOf(isolated);
    let rv: { topId: string; leafId: string; } | undefined;
    walkNodes(
        docState.doc.children,
        (node: SvgNode, parents) => {
            if (isHidden(node) || isLocked(node)) {
                return false;
            }
            // Groups are still entered: an isolated object may sit inside one. Leaves outside isolation are skipped.
            if (scope.length && !scope.includes(node.id) && !parents.some((g) => scope.includes(g.id)) && node.kind !== 'g') {
                return;
            }
            const outline = nodeOutline(node);
            if (!outline) {
                return;
            }
            const loc = findNode(docState.doc, node.id);
            if (!loc) {
                return;
            }
            const ctm = nodeCtm(loc);
            const local = applyMatrix(invert(ctm), p);
            const tol = tolerance / matrixScale(ctm);
            if (distanceToOutline(outline, local) <= tol || (isFilled(node) && pointInOutline(outline, local))) {
                rv = { topId: parents[0]?.id ?? node.id, leafId: node.id }; // later nodes paint on top, keep the last hit
            }
        }
    );
    return rv;
}

function isFilled(node: SvgNode): boolean {
    return fillIsHittable(node.attrs);
}
