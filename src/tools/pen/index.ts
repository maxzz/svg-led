import { PenTool } from "lucide-react";
import { type Getter, type Setter } from "jotai";
import { type Anchor, type Point, type SubPath, applyMatrix, constrain45, distance, findNode, newNodeId, parseAnchorKey, pathDataToSubpaths, pullHandles, subpathsToPathData } from "@/svg-core";
import { commitHistory, docPrecision, docState, getNodeProxy } from "@/store/3-document";
import { type PenDraft, ToolId, penDraftAtom, selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { newShapeStyleAtom } from "@/store/2-persist";
import { type ToolDef } from "../1-types";
import { MODIFIERS, isMod } from "../select/8-modifiers";
import { docTolerance, nodeMatrices, snapDoc } from "../0-shared/2-tool-helpers";
import { pastThreshold } from "../0-shared/3-move-gesture";
import { styleAttrs } from "../0-shared/4-style-attrs";
import { modifierHint } from "../0-shared/5-hint";

const M = MODIFIERS.pen;

/** Pointer is down: dragging pulls handles out of the anchor that was just placed (or of the start anchor when closing) */
let gesture: { ai: number; startScreen: Point; moved: boolean; closing: boolean; } | null = null;

export const penTool: ToolDef = {
    id: ToolId.pen,
    label: 'Pen',
    shortcut: 'p',
    altShortcut: '6',
    icon: PenTool,
    hint: ({ get, held, dragging }) => {
        if (dragging) {
            return 'Release to finish · [Shift] 45° · [Alt] break handle';
        }
        const legend = get(penDraftAtom)
            ? 'Click to add points · Click the first point to close · [Enter] or [Esc] to finish'
            : 'Click for corner points, drag for smooth · [Shift] 45° · [Alt] break handle';
        return modifierHint(held, legend, {
            shift: '[Shift] Drag a handle to snap to 45°',
            alt: '[Alt] Drag to move only the outgoing handle',
        });
    },
    cursor: 'crosshair',
    newShapeKind: 'path',

    onPointerDown({ get, set }, e) {
        const draft = get(penDraftAtom);

        if (!draft) {
            // continue an open path from one of its end points
            if (e.target.type === 'anchor') {
                const node = getNodeProxy(e.target.nodeId);
                if (node?.kind === 'path') {
                    const subs = pathDataToSubpaths(node.d);
                    const [si, ai] = parseAnchorKey(e.target.key);
                    const sub = subs[si];
                    if (sub && !sub.closed && (ai === 0 || ai === sub.anchors.length - 1)) {
                        if (ai === 0) {
                            reverseSubpath(sub);
                        }
                        set(penDraftAtom, { nodeId: node.id, subpaths: subs, si, isNew: false, startCount: sub.anchors.length });
                        set(setSelectionAtom, [node.id]);
                        gesture = { ai: sub.anchors.length - 1, startScreen: e.screen, moved: false, closing: false };
                        return;
                    }
                }
            }

            const p = snapDoc(e.doc);
            const id = newNodeId();
            const subpaths: SubPath[] = [{ anchors: [{ x: p.x, y: p.y, kind: 'corner' }], closed: false }];
            docState.doc.children.push({ id, kind: 'path', d: subpathsToPathData(subpaths, docPrecision()), attrs: styleAttrs(get(newShapeStyleAtom)) });
            set(penDraftAtom, { nodeId: id, subpaths, si: 0, isNew: true, startCount: 0 });
            set(setSelectionAtom, [id]);
            gesture = { ai: 0, startScreen: e.screen, moved: false, closing: false };
            return;
        }

        const m = nodeMatrices(draft.nodeId);
        if (!m) {
            set(penDraftAtom, null);
            return;
        }
        const sub = draft.subpaths[draft.si];
        const first = sub.anchors[0];

        const onFirst = (e.target.type === 'anchor' && e.target.nodeId === draft.nodeId && e.target.key === `${draft.si}:0`)
            || distance(applyMatrix(m.ctm, first), e.doc) < docTolerance(get, 6);

        if (onFirst && sub.anchors.length >= 2) {
            sub.closed = true;
            writeDraft(set, draft);
            gesture = { ai: 0, startScreen: e.screen, moved: false, closing: true };
            return;
        }

        const local = applyMatrix(m.inv, snapDoc(e.doc));
        sub.anchors.push({ x: local.x, y: local.y, kind: 'corner' });
        writeDraft(set, draft);
        gesture = { ai: sub.anchors.length - 1, startScreen: e.screen, moved: false, closing: false };
    },

    onPointerMove({ get, set }, e) {
        const draft = get(penDraftAtom);
        if (!gesture || !draft) {
            return;
        }
        if (!gesture.moved && !pastThreshold(gesture.startScreen, e.screen)) {
            return;
        }
        gesture.moved = true;

        const m = nodeMatrices(draft.nodeId);
        const a = draft.subpaths[draft.si]?.anchors[gesture.ai];
        if (!m || !a) {
            return;
        }
        let p = applyMatrix(m.inv, e.doc);
        if (isMod(e, M.constrainAngle)) {
            p = constrain45(a, p);
        }
        if (isMod(e, M.breakHandle) && a.in) {
            a.out = p;
            a.kind = 'cusp';
        } else {
            pullHandles(a, p);
        }
        writeDraft(set, draft);
    },

    onPointerUp(ctx) {
        const closing = gesture?.closing;
        gesture = null;
        if (closing) {
            finishDraft(ctx.get, ctx.set);
        }
    },

    onKeyDown({ get, set }, e) {
        const draft = get(penDraftAtom);
        if (!draft) {
            return false;
        }
        if (e.key === 'Enter' || e.key === 'Escape') {
            finishDraft(get, set);
            return true;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const sub = draft.subpaths[draft.si];
            if (sub.anchors.length > 1) {
                sub.anchors.pop();
                writeDraft(set, draft);
            }
            return true;
        }
        return false;
    },

    onDeactivate({ get, set }) {
        finishDraft(get, set);
    },
};

function writeDraft(set: Setter, draft: PenDraft): void {
    const loc = findNode(docState.doc, draft.nodeId);
    if (loc?.node.kind === 'path') {
        loc.node.d = subpathsToPathData(draft.subpaths, docPrecision());
    }
    set(penDraftAtom, { ...draft });
}

export function finishDraft(get: Getter, set: Setter): void {
    const draft = get(penDraftAtom);
    if (!draft) {
        return;
    }
    set(penDraftAtom, null);
    gesture = null;

    const sub = draft.subpaths[draft.si];
    if (draft.isNew && sub.anchors.length < 2) {
        const loc = findNode(docState.doc, draft.nodeId);
        loc?.siblings.splice(loc.index, 1);
        set(selectionAtom, []);
        return;
    }
    if (sub.anchors.length !== draft.startCount || sub.closed || draft.isNew) {
        commitHistory();
    }
}

function reverseSubpath(sub: SubPath): void {
    sub.anchors.reverse();
    for (const a of sub.anchors as Anchor[]) {
        const tmp = a.in;
        a.in = a.out;
        a.out = tmp;
        if (!a.in) delete a.in;
        if (!a.out) delete a.out;
    }
}
