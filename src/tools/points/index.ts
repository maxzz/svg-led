import { MousePointer } from "lucide-react";
import { snapshot } from "valtio";
import { toast } from "sonner";
import {
    type Matrix, type Point, type ShapeNode, type SubPath, type SvgDoc, type SvgNode, applyMatrix, applyShapeHandle, applyToVector,
    constrain45, deleteAnchors, findNode, getAnchor, getShapeHandles, insertAnchor, isShapeNode, matrixScale, moveAnchor, nearestSegment,
    nodeCtm, parseAnchorKey, pathDataToSubpaths, pullHandles, rectContainsPoint, rectFromCorners, setHandle, subpathsToPathData,
    toggleAnchorKind, walkNodes,
} from "@/svg-core";
import { commitHistory, docPrecision, docState, getNodeProxy, replaceNode } from "@/store/3-document";
import {
    ToolId, anchorsOfNode, marqueeAtom, nodeAnchorKey, screenToDoc, selectedAnchorsAtom, selectionAtom, setActiveToolAtom,
    splitNodeAnchorKey, viewportAtom,
} from "@/store/4-editor";
import { type ToolDef, type ToolPointerEvent } from "../1-types";
import { MODIFIERS, isMod } from "../3-modifiers";
import { docTolerance, hitTestOutlines, nodeMatrices, snapValue } from "../0-shared/2-tool-helpers";
import { type MoveGesture, beginMove, endMove, pastThreshold, updateMove } from "../0-shared/3-move-gesture";

const M = MODIFIERS.points;

type PathOriginal = { kind: 'path'; subs: SubPath[]; inv: Matrix; };
type ShapeOriginal = { kind: 'shape'; node: ShapeNode; inv: Matrix; ctm: Matrix; };

type Gesture =
    | { type: 'anchors'; startDoc: Point; startScreen: Point; moved: boolean; originals: Map<string, PathOriginal | ShapeOriginal>; keys: string[]; }
    | { type: 'handle'; nodeId: string; key: string; side: 'in' | 'out'; subs: SubPath[]; inv: Matrix; moved: boolean; }
    | { type: 'alt-anchor'; nodeId: string; key: string; subs: SubPath[]; inv: Matrix; startScreen: Point; moved: boolean; }
    | { type: 'node-move'; move: MoveGesture; }
    | { type: 'marquee'; startScreen: Point; baseAnchors: string[]; baseNodes: string[]; candidates: { full: string; nodeId: string; doc: Point; }[]; };

let gesture: Gesture | null = null;

export const pointsTool: ToolDef = {
    id: ToolId.points,
    label: 'Direct selection',
    shortcut: 'a',
    icon: MousePointer,
    hint: 'Drag anchors and handles. Alt: break handle / convert anchor, Ctrl+click: add or delete point, Esc: back to selection',
    cursor: 'default',

    onPointerDown({ get, set }, e) {
        const selection = get(selectionAtom);
        const selectedAnchors = get(selectedAnchorsAtom);
        let target = e.target;

        if (target.type === 'none') {
            const hit = hitTestOutlines(e.doc, docTolerance(get, 4));
            if (hit) {
                target = { type: 'node', ...hit };
            }
        }

        if (isMod(e, M.addDeletePoint)) {
            if (target.type === 'anchor') {
                deletePathAnchors(target.nodeId, new Set([target.key]));
                set(selectedAnchorsAtom, []);
                commitHistory();
                return;
            }
            const candidates = new Set(selection);
            if (target.type === 'node') {
                candidates.add(target.leafId);
            }
            const added = addPointNear([...candidates], e.doc, docTolerance(get, 8));
            if (added) {
                set(selectionAtom, [...new Set([...selection, added.nodeId])]);
                set(selectedAnchorsAtom, [nodeAnchorKey(added.nodeId, added.key)]);
                commitHistory();
            } else if (target.type === 'node') {
                const node = getNodeProxy(target.leafId);
                node && isShapeNode(node) && toast.info('Use "Convert to path" to add points to this shape');
            }
            return;
        }

        if (target.type === 'handle') {
            const m = nodeMatrices(target.nodeId);
            const subs = pathSubpaths(target.nodeId);
            if (m && subs) {
                gesture = { type: 'handle', nodeId: target.nodeId, key: target.key, side: target.side, subs, inv: m.inv, moved: false };
            }
            return;
        }

        if (target.type === 'anchor' && isMod(e, M.convertAnchor)) {
            const m = nodeMatrices(target.nodeId);
            const subs = pathSubpaths(target.nodeId);
            if (m && subs) {
                gesture = { type: 'alt-anchor', nodeId: target.nodeId, key: target.key, subs, inv: m.inv, startScreen: e.screen, moved: false };
            }
            return;
        }

        if (target.type === 'anchor' || target.type === 'shape-handle') {
            const full = nodeAnchorKey(target.nodeId, target.type === 'anchor' ? target.key : `h:${target.key}`);
            let keys = selectedAnchors;
            if (isMod(e, M.toggleAnchor)) {
                if (keys.includes(full)) {
                    set(selectedAnchorsAtom, keys.filter((k) => k !== full));
                    return;
                }
                keys = [...keys, full];
            } else if (!keys.includes(full)) {
                keys = [full];
            }
            set(selectedAnchorsAtom, keys);
            gesture = beginAnchorsGesture(keys, e);
            return;
        }

        if (target.type === 'node') {
            const id = target.leafId;
            let ids = selection;
            if (isMod(e, M.toggleAnchor)) {
                ids = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id];
                set(selectionAtom, ids);
                return;
            }
            if (!selection.includes(id)) {
                ids = [id];
                set(selectionAtom, ids);
                set(selectedAnchorsAtom, []);
            }
            gesture = { type: 'node-move', move: beginMove(ids, e) };
            return;
        }

        // empty canvas
        const additive = isMod(e, M.toggleAnchor);
        if (!additive) {
            if (selectedAnchors.length) {
                set(selectedAnchorsAtom, []);
            } else {
                set(selectionAtom, []);
            }
        }
        gesture = {
            type: 'marquee',
            startScreen: e.screen,
            baseAnchors: additive ? selectedAnchors : [],
            baseNodes: additive || selectedAnchors.length ? selection : [],
            candidates: collectAnchorCandidates(),
        };
    },

    onPointerMove({ get, set }, e) {
        if (!gesture) {
            return;
        }
        switch (gesture.type) {
            case 'anchors':
                moveAnchorsGesture(gesture, e);
                break;

            case 'handle': {
                gesture.moved = true;
                const subs = structuredClone(gesture.subs);
                const a = getAnchor(subs, gesture.key);
                if (a) {
                    let p = applyMatrix(gesture.inv, e.doc);
                    if (isMod(e, M.constrainAngle)) {
                        p = constrain45(a, p);
                    }
                    setHandle(a, gesture.side, p, isMod(e, M.breakHandle));
                    writePath(gesture.nodeId, subs);
                }
                break;
            }

            case 'alt-anchor': {
                if (!gesture.moved && !pastThreshold(gesture.startScreen, e.screen)) {
                    return;
                }
                gesture.moved = true;
                const subs = structuredClone(gesture.subs);
                const a = getAnchor(subs, gesture.key);
                if (a) {
                    let p = applyMatrix(gesture.inv, e.doc);
                    if (isMod(e, M.constrainAngle)) {
                        p = constrain45(a, p);
                    }
                    pullHandles(a, p);
                    writePath(gesture.nodeId, subs);
                }
                break;
            }

            case 'node-move':
                updateMove(gesture.move, e, e.shift);
                break;

            case 'marquee': {
                set(marqueeAtom, rectFromCorners(gesture.startScreen, e.screen));
                const docRect = rectFromCorners(screenToDoc(get(viewportAtom), gesture.startScreen), e.doc);
                const inside = gesture.candidates.filter((c) => rectContainsPoint(docRect, c.doc));
                set(selectedAnchorsAtom, [...new Set([...gesture.baseAnchors, ...inside.map((c) => c.full)])]);
                set(selectionAtom, [...new Set([...gesture.baseNodes, ...inside.map((c) => c.nodeId)])]);
                break;
            }
        }
    },

    onPointerUp({ set }) {
        if (!gesture) {
            return;
        }
        switch (gesture.type) {
            case 'anchors':
            case 'handle':
                gesture.moved && commitHistory();
                break;
            case 'alt-anchor': {
                if (!gesture.moved) {
                    const subs = structuredClone(gesture.subs);
                    const [si, ai] = parseAnchorKey(gesture.key);
                    subs[si] && toggleAnchorKind(subs[si], ai);
                    writePath(gesture.nodeId, subs);
                }
                commitHistory();
                break;
            }
            case 'node-move':
                endMove(gesture.move);
                break;
            case 'marquee':
                set(marqueeAtom, null);
                break;
        }
        gesture = null;
    },

    onKeyDown({ get, set }, e) {
        const selectedAnchors = get(selectedAnchorsAtom);

        if (e.key === 'Escape') {
            set(setActiveToolAtom, ToolId.select);
            return true;
        }

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnchors.length) {
            const byNode = new Map<string, Set<string>>();
            for (const full of selectedAnchors) {
                const [nodeId, key] = splitNodeAnchorKey(full);
                if (!key.startsWith('h:')) {
                    byNode.set(nodeId, (byNode.get(nodeId) ?? new Set()).add(key));
                }
            }
            for (const [nodeId, keys] of byNode) {
                deletePathAnchors(nodeId, keys);
            }
            set(selectedAnchorsAtom, []);
            byNode.size && commitHistory();
            return true;
        }

        const arrows: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
        const dir = arrows[e.key];
        if (dir && selectedAnchors.length) {
            const step = e.shiftKey ? 10 : 1;
            const g = beginAnchorsGesture(selectedAnchors, { doc: { x: 0, y: 0 }, screen: { x: 0, y: 0 } } as ToolPointerEvent);
            g.moved = true;
            applyAnchorsDelta(g, { x: dir.x * step, y: dir.y * step }, false);
            commitHistory({ mergeKey: 'nudge-anchors' });
            return true;
        }
        return false;
    },
};

// Anchor drag

function beginAnchorsGesture(keys: string[], e: ToolPointerEvent): Extract<Gesture, { type: 'anchors'; }> {
    const originals = new Map<string, PathOriginal | ShapeOriginal>();
    for (const full of keys) {
        const [nodeId] = splitNodeAnchorKey(full);
        if (originals.has(nodeId)) {
            continue;
        }
        const node = cloneNodeSnapshot(nodeId);
        const m = nodeMatrices(nodeId);
        if (!node || !m) {
            continue;
        }
        if (node.kind === 'path') {
            originals.set(nodeId, { kind: 'path', subs: pathDataToSubpaths(node.d), inv: m.inv });
        } else if (isShapeNode(node)) {
            originals.set(nodeId, { kind: 'shape', node, inv: m.inv, ctm: m.ctm });
        }
    }
    return { type: 'anchors', startDoc: e.doc, startScreen: e.screen, moved: false, originals, keys };
}

function moveAnchorsGesture(g: Extract<Gesture, { type: 'anchors'; }>, e: ToolPointerEvent): void {
    if (!g.moved && !pastThreshold(g.startScreen, e.screen)) {
        return;
    }
    g.moved = true;
    let dx = snapValue(e.doc.x - g.startDoc.x);
    let dy = snapValue(e.doc.y - g.startDoc.y);
    if (e.shift) {
        Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
    }
    applyAnchorsDelta(g, { x: dx, y: dy }, e.shift);
}

function applyAnchorsDelta(g: Extract<Gesture, { type: 'anchors'; }>, delta: Point, constrain: boolean): void {
    for (const [nodeId, orig] of g.originals) {
        const keys = anchorsOfNode(g.keys, nodeId);
        if (orig.kind === 'path') {
            const subs = structuredClone(orig.subs);
            const local = applyToVector(orig.inv, delta);
            for (const key of keys) {
                const a = getAnchor(subs, key);
                a && moveAnchor(a, local.x, local.y);
            }
            writePath(nodeId, subs);
        } else {
            const node = structuredClone(orig.node);
            for (const handle of getShapeHandles(orig.node)) {
                if (keys.has(`h:${handle.key}`)) {
                    const docPos = applyMatrix(orig.ctm, handle);
                    const local = applyMatrix(orig.inv, { x: docPos.x + delta.x, y: docPos.y + delta.y });
                    applyShapeHandle(node, handle.key, local, constrain);
                }
            }
            replaceNode(nodeId, node);
        }
    }
}

// Path editing helpers

function cloneNodeSnapshot(id: string): SvgNode | undefined {
    const loc = findNode(docState.doc, id);
    return loc && structuredClone(snapshot(loc.node) as SvgNode);
}

function pathSubpaths(id: string): SubPath[] | undefined {
    const node = getNodeProxy(id);
    return node?.kind === 'path' ? pathDataToSubpaths(node.d) : undefined;
}

function writePath(id: string, subs: SubPath[]): void {
    const loc = findNode(docState.doc, id);
    if (!loc || loc.node.kind !== 'path') {
        return;
    }
    if (!subs.length) {
        loc.siblings.splice(loc.index, 1);
        return;
    }
    loc.node.d = subpathsToPathData(subs, docPrecision());
}

function deletePathAnchors(nodeId: string, keys: Set<string>): void {
    const subs = pathSubpaths(nodeId);
    subs && writePath(nodeId, deleteAnchors(subs, keys));
}

/** Ctrl+click near a segment of one of the candidate paths inserts an anchor there */
function addPointNear(nodeIds: string[], p: Point, tolerance: number): { nodeId: string; key: string; } | undefined {
    let best: { nodeId: string; dist: number; si: number; seg: number; t: number; subs: SubPath[]; } | undefined;
    for (const nodeId of nodeIds) {
        const subs = pathSubpaths(nodeId);
        const m = nodeMatrices(nodeId);
        if (!subs || !m) {
            continue;
        }
        const hit = nearestSegment(subs, applyMatrix(m.inv, p));
        if (!hit) {
            continue;
        }
        const dist = hit.dist * matrixScale(m.ctm);
        if (dist <= tolerance && (!best || dist < best.dist)) {
            best = { nodeId, dist, si: hit.si, seg: hit.seg, t: hit.t, subs };
        }
    }
    if (!best) {
        return;
    }
    const key = insertAnchor(best.subs, best.si, best.seg, best.t);
    writePath(best.nodeId, best.subs);
    return { nodeId: best.nodeId, key };
}

/** Every anchor and shape handle of editable elements, in document coordinates (for the rubber band) */
function collectAnchorCandidates(): { full: string; nodeId: string; doc: Point; }[] {
    const doc = snapshot(docState).doc as SvgDoc;
    const rv: { full: string; nodeId: string; doc: Point; }[] = [];
    walkNodes(
        doc.children,
        (node) => {
            const loc = findNode(doc, node.id);
            if (!loc) {
                return;
            }
            const ctm = nodeCtm(loc);
            if (node.kind === 'path') {
                pathDataToSubpaths(node.d).forEach(
                    (s, si) => s.anchors.forEach((a, ai) => rv.push({ full: nodeAnchorKey(node.id, `${si}:${ai}`), nodeId: node.id, doc: applyMatrix(ctm, a) }))
                );
            } else if (isShapeNode(node)) {
                for (const h of getShapeHandles(node)) {
                    rv.push({ full: nodeAnchorKey(node.id, `h:${h.key}`), nodeId: node.id, doc: applyMatrix(ctm, h) });
                }
            }
        }
    );
    return rv;
}
