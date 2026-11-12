import { atom, type Getter } from "jotai";

import { type Point, applyMatrix, matrixScale, nearestSegment, pathDataToSubpaths } from "@/svg-core";
import { getNodeProxy } from "@/store/3-document";
import { heldKeysAtom, selectionAtom } from "@/store/4-editor";
import { getIsolationScope } from "@/store/6-layers";
import { type ToolPointerEvent } from "../9-types-tool-def";
import { docTolerance, hitTestOutlines, nodeMatrices } from "../0-shared/2-tool-helpers";
import { withoutSpringKey } from "../3-core-points-prev-tool-spring/a-tool-spring-atoms";
import { type PointsHover, pointsCursorClass } from "./2-points-cursor-class";

export type { PointsHover };
export { pointsCursorClass };

const NONE: PointsHover = { kind: 'none', selected: false, canAdd: false };

const pointsHoverAtom = atom<PointsHover>(NONE);

/** The path anchor under the pointer in Direct selection, or null */
export const hoveredAnchorAtom = atom((get) => get(pointsHoverAtom).anchor ?? null);

/** The direction handle under the pointer in Direct selection, or null */
export const hoveredHandleAtom = atom((get) => get(pointsHoverAtom).handle ?? null);

type Ref = { nodeId: string; key: string; side?: 'in' | 'out'; };

function sameRef(a: Ref | undefined, b: Ref | undefined): boolean {
    return a?.nodeId === b?.nodeId && a?.key === b?.key && a?.side === b?.side;
}

export const setPointsHoverAtom = atom(
    null,
    (get, set, hover: PointsHover | null) => {
        const next = hover ?? NONE;
        const cur = get(pointsHoverAtom);
        if (cur.kind !== next.kind || cur.selected !== next.selected || cur.canAdd !== next.canAdd || !sameRef(cur.anchor, next.anchor) || !sameRef(cur.handle, next.handle)) {
            set(pointsHoverAtom, next);
        }
    }
);

/** True while a drag moves points, handles, or a whole element. Hover is cleared on pointer down, so the cursor reads this instead. */
export const pointsDraggingAtom = atom(false);

/** A path anchor (`side` unset) or direction handle (`side` set) with `key` = `subpath:anchor` */
export type PointRef = { nodeId: string; key: string; side?: 'in' | 'out'; };

/**
 * The point the pointer grabbed: set on pointer down on an anchor or handle, kept through the drag and after release
 * (so the final, snapped position stays shown), and cleared once the pointer hovers something else or leaves the canvas.
 */
export const pointFocusAtom = atom<PointRef | null>(null);

export const pointsCursorAtom = atom(
    (get) => pointsCursorClass(get(pointsHoverAtom), withoutSpringKey(get, get(heldKeysAtom)), get(pointsDraggingAtom))
);

//---------------------------------------------------------------------------

/** Same reach as a Ctrl+click that inserts an anchor */
const ADD_PX = 8;

/** What a Direct selection click would act on, including a thin stroke the overlay does not hit */
export function resolvePointsHover(get: Getter, e: Pick<ToolPointerEvent, 'doc' | 'target'>): PointsHover {
    let target = e.target;
    if (target.type === 'none') {
        const hit = hitTestOutlines(e.doc, docTolerance(get, 4), getIsolationScope(get));
        if (hit) {
            target = { type: 'node', ...hit };
        }
    }

    const selected = target.type === 'node' && get(selectionAtom).includes(target.leafId);
    const candidates = target.type === 'node' ? [...new Set([...get(selectionAtom), target.leafId])] : get(selectionAtom);
    const canAdd = nearSegment(get, candidates, e.doc);

    if (target.type === 'anchor') {
        return { kind: 'anchor', selected: true, canAdd, anchor: { nodeId: target.nodeId, key: target.key } };
    }

    if (target.type === 'handle') {
        return { kind: 'handle', selected: true, canAdd, handle: { nodeId: target.nodeId, key: target.key, side: target.side } };
    }

    if (target.type === 'shape-handle') {
        return { kind: 'shape-handle', selected: true, canAdd };
    }

    if (target.type === 'node') {
        return { kind: 'node', selected, canAdd };
    }

    return { kind: 'none', selected: false, canAdd };
}

function nearSegment(get: Getter, nodeIds: readonly string[], p: Point): boolean {
    const tolerance = docTolerance(get, ADD_PX);

    for (const nodeId of nodeIds) {
        const node = getNodeProxy(nodeId);
        const m = nodeMatrices(nodeId);
        if (node?.kind !== 'path' || !m) {
            continue;
        }
        const hit = nearestSegment(pathDataToSubpaths(node.d), applyMatrix(m.inv, p));
        if (hit && hit.dist * matrixScale(m.ctm) <= tolerance) {
            return true;
        }
    }
    
    return false;
}
