import { type Getter, type Setter } from "jotai";
import { type Matrix, type Point, type SubPath, applyMatrix, deleteAnchors, distance, findNode, insertAnchor, matrixScale, nearestSegment, pathDataToSubpaths, subpathsToPathData } from "@/svg-core";
import { docPrecision, docState, getNodeProxy } from "@/store/3-document";
import { type PenDraft, penDraftAtom, selectionAtom } from "@/store/4-editor";
import { type ToolPointerEvent } from "../9-types-tool-def";
import { docTolerance, nodeMatrices } from "../0-shared/2-tool-helpers";

/**
 * What a Pen click does at the pointer, like Illustrator's pen: over a segment of the selected path it adds a point,
 * over one of its anchors it deletes it, over an open end it continues the path, and over the first point of the
 * path being drawn it closes it. Anywhere else (null) it places a new point.
 */
export type PenAction =
    | { type: 'add'; nodeId: string; si: number; seg: number; t: number; }
    | { type: 'delete'; nodeId: string; key: string; }
    | { type: 'continue'; nodeId: string; key: string; }
    | { type: 'close'; };

export type PenActionType = PenAction['type'];

/** Screen pixels around an anchor or segment that still count as over it */
const ANCHOR_PX = 5;
const SEGMENT_PX = 4;

export function resolvePenAction(get: Getter, e: Pick<ToolPointerEvent, 'doc'>): PenAction | null {
    const draft = get(penDraftAtom);
    return draft ? draftAction(get, draft, e) : selectionAction(get, e);
}

/** While drawing, only the subpath being drawn is edited; its last anchor is skipped so a click there still places a point */
function draftAction(get: Getter, draft: PenDraft, e: Pick<ToolPointerEvent, 'doc'>): PenAction | null {
    const m = nodeMatrices(draft.nodeId);
    const sub = draft.subpaths[draft.si];
    if (!m || !sub) {
        return null;
    }
    const n = sub.anchors.length;
    const ai = nearestAnchor(sub, m.ctm, e.doc, docTolerance(get, ANCHOR_PX));
    if (ai === 0 && n >= 2 && !sub.closed) {
        return { type: 'close' };
    }
    if (ai !== undefined && ai < n - 1) {
        return { type: 'delete', nodeId: draft.nodeId, key: `${draft.si}:${ai}` };
    }
    const hit = nearestSegment([sub], applyMatrix(m.inv, e.doc));
    if (hit && hit.dist * matrixScale(m.ctm) <= docTolerance(get, SEGMENT_PX)) {
        return { type: 'add', nodeId: draft.nodeId, si: draft.si, seg: hit.seg, t: hit.t };
    }
    return null;
}

/** Before drawing: anchors of the selected paths win over their segments; the nearest one wins */
function selectionAction(get: Getter, e: Pick<ToolPointerEvent, 'doc'>): PenAction | null {
    const anchorTol = docTolerance(get, ANCHOR_PX);
    const segmentTol = docTolerance(get, SEGMENT_PX);
    let anchor: { dist: number; action: PenAction; } | undefined;
    let segment: { dist: number; action: PenAction; } | undefined;

    for (const nodeId of get(selectionAtom)) {
        const node = getNodeProxy(nodeId);
        const m = nodeMatrices(nodeId);
        if (node?.kind !== 'path' || !m) {
            continue;
        }
        const subs = pathDataToSubpaths(node.d);
        subs.forEach((sub, si) => {
            sub.anchors.forEach((a, ai) => {
                const dist = distance(applyMatrix(m.ctm, a), e.doc);
                if (dist <= anchorTol && (!anchor || dist < anchor.dist)) {
                    const openEnd = !sub.closed && (ai === 0 || ai === sub.anchors.length - 1);
                    anchor = { dist, action: { type: openEnd ? 'continue' : 'delete', nodeId, key: `${si}:${ai}` } };
                }
            });
        });
        const hit = nearestSegment(subs, applyMatrix(m.inv, e.doc));
        const dist = hit && hit.dist * matrixScale(m.ctm);
        if (hit && dist !== undefined && dist <= segmentTol && (!segment || dist < segment.dist)) {
            segment = { dist, action: { type: 'add', nodeId, si: hit.si, seg: hit.seg, t: hit.t } };
        }
    }
    return anchor?.action ?? segment?.action ?? null;
}

/** Anchor under the pointer that the Pen can convert: any anchor of the subpath being drawn, or of a selected path */
export function penAnchorAt(get: Getter, p: Point): { nodeId: string; key: string; } | undefined {
    const tolerance = docTolerance(get, ANCHOR_PX);
    const draft = get(penDraftAtom);
    if (draft) {
        const m = nodeMatrices(draft.nodeId);
        const sub = draft.subpaths[draft.si];
        const ai = m && sub ? nearestAnchor(sub, m.ctm, p, tolerance) : undefined;
        return ai !== undefined ? { nodeId: draft.nodeId, key: `${draft.si}:${ai}` } : undefined;
    }

    let best: { nodeId: string; key: string; dist: number; } | undefined;
    for (const nodeId of get(selectionAtom)) {
        const node = getNodeProxy(nodeId);
        const m = nodeMatrices(nodeId);
        if (node?.kind !== 'path' || !m) {
            continue;
        }
        pathDataToSubpaths(node.d).forEach((sub, si) => sub.anchors.forEach((a, ai) => {
            const dist = distance(applyMatrix(m.ctm, a), p);
            if (dist <= tolerance && (!best || dist < best.dist)) {
                best = { nodeId, key: `${si}:${ai}`, dist };
            }
        }));
    }
    return best && { nodeId: best.nodeId, key: best.key };
}

function nearestAnchor(sub: SubPath, ctm: Matrix, p: Point, tolerance: number): number | undefined {
    let best: { ai: number; dist: number; } | undefined;
    sub.anchors.forEach((a, ai) => {
        const dist = distance(applyMatrix(ctm, a), p);
        if (dist <= tolerance && (!best || dist < best.dist)) {
            best = { ai, dist };
        }
    });
    return best?.ai;
}

//---------------------------------------------------------------------------

/** Writes the geometry of the path being drawn to its element and publishes the draft */
export function writeDraft(set: Setter, draft: PenDraft): void {
    const loc = findNode(docState.doc, draft.nodeId);
    if (loc?.node.kind === 'path') {
        loc.node.d = subpathsToPathData(draft.subpaths, docPrecision());
    }
    set(penDraftAtom, { ...draft });
}

/** Adds or deletes a point of the path being drawn; the subpath keeps at least one anchor */
export function editDraftPoints(draft: PenDraft, action: Extract<PenAction, { type: 'add' | 'delete'; }>): void {
    if (action.type === 'add') {
        insertAnchor(draft.subpaths, action.si, action.seg, action.t);
    } else {
        const sub = draft.subpaths[draft.si];
        const ai = Number(action.key.split(':')[1]);
        sub.anchors.length > 1 && sub.anchors.splice(ai, 1);
    }
    draft.edited = true;
}

/**
 * Adds or deletes a point of a selected path in the document. Deleting can drop a subpath that is left with
 * a single anchor, or the whole element; returns false when the element was removed.
 */
export function editPathPoints(action: Extract<PenAction, { type: 'add' | 'delete'; }>): boolean {
    const loc = findNode(docState.doc, action.nodeId);
    if (loc?.node.kind !== 'path') {
        return true;
    }
    let subs = pathDataToSubpaths(loc.node.d);
    if (action.type === 'add') {
        insertAnchor(subs, action.si, action.seg, action.t);
    } else {
        subs = deleteAnchors(subs, new Set([action.key]));
    }
    if (!subs.length) {
        loc.siblings.splice(loc.index, 1);
        return false;
    }
    loc.node.d = subpathsToPathData(subs, docPrecision());
    return true;
}
