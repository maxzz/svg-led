import { atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { type SvgDoc, type SvgNode, findNode, topmostIds } from "@/svg-core";
import { docState } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { canBakeMatrix } from "./1-bake-matrix";
import { commitMatrixText, selectionMatrixView } from "./0-matrix-text";
import { applySelectionMatrices, removeSelectionMatrices, writeSelectionMatrix } from "./2-matrix-commands";

//---------------------------------------------------------------------------
// The matrix field reads the Valtio document and the Jotai selection.
// Draft text lives in the input element. These atoms only keep what must survive a re-render:
// whether the typed text was rejected, and a counter that remounts the input after a commit.

const docAtom = atomWithProxy(docState);

type MatrixSource = {
    ids: string[];
    /** Changes when the selection or any of its transform attributes change */
    key: string;
    shown: boolean;
    mixed: boolean;
    text: string;
    canApply: boolean;
};

const matrixSourceAtom = atom((get): MatrixSource => {
    const doc = get(docAtom).doc as unknown as SvgDoc;
    const ids = topmostIds(doc, get(selectionAtom));
    const nodes: SvgNode[] = [];
    for (const id of ids) {
        const node = findNode(doc, id)?.node;
        if (node) {
            nodes.push(node);
        }
    }

    const view = selectionMatrixView(nodes);
    return {
        ids,
        key: ids.map((id, i) => `${id}:${nodes[i]?.attrs.transform ?? ""}`).join("|"),
        shown: view.shown,
        mixed: view.mixed,
        text: view.text,
        canApply: nodes.some(canBakeMatrix),
    };
});

const matrixInvalidAtom = atom<{ key: string; raw: string } | null>(null);
const matrixEpochAtom = atom(0);

export type MatrixFieldState = {
    shown: boolean;
    text: string;
    placeholder: string;
    invalid: boolean;
    canApply: boolean;
    /** Remounts the uncontrolled input when the committed matrix changes */
    inputKey: string;
};

export const matrixFieldAtom = atom((get): MatrixFieldState => {
    const source = get(matrixSourceAtom);
    const invalid = get(matrixInvalidAtom);
    return {
        shown: source.shown,
        text: source.text,
        placeholder: source.mixed ? "Mixed" : "",
        invalid: invalid?.key === source.key,
        canApply: source.canApply,
        inputKey: `${source.key}@${get(matrixEpochAtom)}`,
    };
});

export type MatrixCommitStatus = "ok" | "invalid" | "invalid-repeat";

/** Writes a committed field value onto the selection. Invalid text is kept and reported. */
export const commitMatrixTextAtom = atom(null, (get, set, raw: string): MatrixCommitStatus => {
    const source = get(matrixSourceAtom);
    const result = commitMatrixText(raw, source.text);

    if (!result.ok) {
        const prev = get(matrixInvalidAtom);
        const repeat = prev?.key === source.key && prev.raw === raw;
        set(matrixInvalidAtom, { key: source.key, raw });
        return repeat ? "invalid-repeat" : "invalid";
    }

    set(matrixInvalidAtom, null);
    if (!result.unchanged) {
        writeSelectionMatrix(source.ids, result.text);
    }
    if (!result.unchanged || result.refresh) {
        set(matrixEpochAtom, get(matrixEpochAtom) + 1);
    }
    return "ok";
});

export const clearMatrixInvalidAtom = atom(null, (_get, set) => {
    set(matrixInvalidAtom, null);
});

/** Bakes the matrix into points. Does nothing while the field is showing a rejected value. */
export const applyMatrixAtom = atom(null, (get, set) => {
    const source = get(matrixSourceAtom);
    const invalid = get(matrixInvalidAtom);
    if (invalid?.key === source.key) {
        return;
    }
    applySelectionMatrices(source.ids);
    set(matrixInvalidAtom, null);
});

/** Drops the matrix and leaves the points alone. */
export const removeMatrixAtom = atom(null, (get, set) => {
    const source = get(matrixSourceAtom);
    removeSelectionMatrices(source.ids);
    set(matrixInvalidAtom, null);
});
