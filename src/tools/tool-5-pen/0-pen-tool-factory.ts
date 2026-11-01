import { PenTool } from "lucide-react";
import { type Getter, type Setter } from "jotai";
import { type Anchor, type Point, type SubPath, applyMatrix, constrain45, findNode, newNodeId, parseAnchorKey, pathDataToSubpaths, pullHandles, subpathsToPathData } from "@/svg-core";
import { commitHistory, docPrecision, docState, getNodeProxy } from "@/store/3-document";
import { type PenDraft, ToolId, penDraftAtom, selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { newShapeStyleAtom } from "@/store/2-persist";
import { insertNodeAtTop, newElementMatrix } from "@/store/6-layers";
import { type ToolDef } from "../9-types-tool-def";
import { MODIFIERS, isMod } from "../tool-2-select/8-definition-of-modifiers";
import { nodeMatrices, snapDoc } from "../0-shared/2-tool-helpers";
import { pastThreshold } from "../0-shared/3-move-gesture";
import { styleAttrs } from "../0-shared/4-style-attrs";
import { modifierHint } from "../0-shared/5-hint";
import { type PenAction, editDraftPoints, editPathPoints, resolvePenAction } from "./1-pen-edit-points";
import { autoAddDeleteOff, penCursorAtom, setPenHoverActionAtom } from "./2-pen-cursor";

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
            ? 'Click to add points · Click the first point to close · Click a segment to add a point, a point to delete it · [Enter] or [Esc] to finish · [Ctrl] select'
            : 'Click for corner points, drag for smooth · On a selected path, click a segment to add a point, a point to delete it · [Ctrl] select';
        return modifierHint(held, legend, {
            shift: '[Shift] Drag a handle to snap to 45° · Place a new point over the selected path instead of adding or deleting',
            alt: '[Alt] Drag to move only the outgoing handle',
        });
    },
    cursor: 'crosshair',
    getCursor: (get) => get(penCursorAtom),
    newShapeKind: 'path',

    onPointerHover({ get, set }, e) {
        set(setPenHoverActionAtom, resolvePenAction(get, e));
    },

    onPointerLeave({ set }) {
        set(setPenHoverActionAtom, null);
    },

    onPointerDown({ get, set }, e) {
        const draft = get(penDraftAtom);
        let action = resolvePenAction(get, e);
        if ((action?.type === 'add' || action?.type === 'delete') && autoAddDeleteOff(e)) {
            action = null;
        }

        if (action?.type === 'add' || action?.type === 'delete') {
            editPoints(get, set, action);
            set(setPenHoverActionAtom, null);
            return;
        }

        if (!draft) {
            // continue an open path from one of its end points
            if (action?.type === 'continue') {
                const node = getNodeProxy(action.nodeId);
                if (node?.kind === 'path') {
                    const subs = pathDataToSubpaths(node.d);
                    const [si, ai] = parseAnchorKey(action.key);
                    const sub = subs[si];
                    if (sub) {
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

            const p = applyMatrix(newElementMatrix(get), snapDoc(e.doc));
            const id = newNodeId();
            const subpaths: SubPath[] = [{ anchors: [{ x: p.x, y: p.y, kind: 'corner' }], closed: false }];
            insertNodeAtTop(get, { id, kind: 'path', d: subpathsToPathData(subpaths, docPrecision()), attrs: styleAttrs(get(newShapeStyleAtom)) });
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

        if (action?.type === 'close') {
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
        set(setPenHoverActionAtom, null);
    },
};

/** Adds or deletes a point: on the path being drawn the draft goes on, on a selected path it is one undo step */
function editPoints(get: Getter, set: Setter, action: Extract<PenAction, { type: 'add' | 'delete'; }>): void {
    const draft = get(penDraftAtom);
    if (draft) {
        editDraftPoints(draft, action);
        writeDraft(set, draft);
        return;
    }
    if (!editPathPoints(action)) {
        set(selectionAtom, get(selectionAtom).filter((id) => id !== action.nodeId));
    }
    commitHistory();
}

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
    if (sub.anchors.length !== draft.startCount || sub.closed || draft.isNew || draft.edited) {
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
