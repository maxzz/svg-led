import { type Getter, type Setter, atom } from "jotai";
import { type Matrix, type Point, type SubPath, applyMatrix, constrain45, findNode, getAnchor, parseAnchorKey, pathDataToSubpaths, pullHandles, subpathsToPathData, toggleAnchorKind } from "@/svg-core";
import { commitHistory, docPrecision, docState, getNodeProxy } from "@/store/3-document";
import { penDraftAtom, pointFocusAtom } from "@/store/4-editor";
import { type ToolPointerEvent } from "../9-types-tool-def";
import { MODIFIERS, isMod } from "../tool-2-select/8-definition-of-modifiers";
import { nodeMatrices } from "../0-shared/2-tool-helpers";
import { pastThreshold } from "../0-shared/3-move-gesture";
import { penAnchorAt, writeDraft } from "./1-pen-edit-points";

/**
 * Pen with Alt over an anchor works like Illustrator's Convert Anchor Point: a click toggles the anchor between
 * corner and smooth, a drag pulls out symmetric handles. Works on selected paths and on the path being drawn.
 */

const M = MODIFIERS.pen;

type ConvertGesture = {
    nodeId: string;
    key: string;
    onDraft: boolean;            // the anchor belongs to the path being drawn; the draft goes on afterwards
    subs: SubPath[];             // geometry when the gesture started, node-local
    inv: Matrix;
    startScreen: Point;
    moved: boolean;
};

//---------------------------------------------------------------------------

let gesture: ConvertGesture | null = null;

/** Anchor whose handles are being pulled; the Pen overlay shows its handles */
export const penConvertingAnchorAtom = atom<{ nodeId: string; key: string; } | null>(null);

//---------------------------------------------------------------------------

/** Starts converting the anchor under the pointer; false when there is none, so the click places a point instead */
export function beginConvertAnchor(get: Getter, set: Setter, e: ToolPointerEvent): boolean {
    if (!isMod(e, M.convertAnchor)) {
        return false;
    }
    const hit = penAnchorAt(get, e.doc);
    const m = hit && nodeMatrices(hit.nodeId);
    if (!hit || !m) {
        return false;
    }
    const draft = get(penDraftAtom);
    const onDraft = draft?.nodeId === hit.nodeId;
    const node = getNodeProxy(hit.nodeId);
    const subs = onDraft ? structuredClone(draft.subpaths) : node?.kind === 'path' ? pathDataToSubpaths(node.d) : undefined;
    if (!subs) {
        return false;
    }
    gesture = { nodeId: hit.nodeId, key: hit.key, onDraft, subs, inv: m.inv, startScreen: e.screen, moved: false };
    set(penConvertingAnchorAtom, hit);
    set(pointFocusAtom, { nodeId: hit.nodeId, key: hit.key });
    return true;
}

/** Returns true while a convert gesture owns the pointer */
export function moveConvertAnchor(get: Getter, set: Setter, e: ToolPointerEvent): boolean {
    if (!gesture) {
        return false;
    }
    if (!gesture.moved && !pastThreshold(gesture.startScreen, e.screen)) {
        return true;
    }
    if (!gesture.moved) {
        set(pointFocusAtom, { nodeId: gesture.nodeId, key: gesture.key, side: 'out' }); // the pulled out handle is the point under the cursor
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
        write(get, set, gesture, subs);
    }
    return true;
}

/** A click without a drag toggles corner and smooth; on a selected path the result is one undo step */
export function endConvertAnchor(get: Getter, set: Setter): boolean {
    const g = gesture;
    if (!g) {
        return false;
    }
    gesture = null;
    set(penConvertingAnchorAtom, null);

    if (!g.moved) {
        const subs = structuredClone(g.subs);
        const [si, ai] = parseAnchorKey(g.key);
        subs[si] && toggleAnchorKind(subs[si], ai);
        write(get, set, g, subs);
    }
    g.onDraft || commitHistory();
    return true;
}

//---------------------------------------------------------------------------

function write(get: Getter, set: Setter, g: ConvertGesture, subs: SubPath[]): void {
    const draft = get(penDraftAtom);
    if (g.onDraft && draft) {
        writeDraft(set, { ...draft, subpaths: subs, edited: true });
        return;
    }
    const loc = findNode(docState.doc, g.nodeId);
    if (loc?.node.kind === 'path') {
        loc.node.d = subpathsToPathData(subs, docPrecision());
    }
}
