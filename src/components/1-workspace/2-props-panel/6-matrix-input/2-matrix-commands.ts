import { snapshot } from "valtio";
import { type SvgNode, findNode, topmostIds } from "@/svg-core";
import { commitHistory, docPrecision, docState, replaceNode } from "@/store/3-document";
import { bakeNodeMatrix, canBakeMatrix } from "./1-bake-matrix";

/** Bakes each selected element's matrix into its points, then drops the matrix. */
export function applySelectionMatrices(ids: readonly string[]): void {
    const precision = docPrecision();
    let changed = false;

    for (const id of topmostIds(docState.doc, ids)) {
        const loc = findNode(docState.doc, id);
        if (!loc) {
            continue;
        }
        const plain = snapshot(loc.node) as SvgNode;
        if (!canBakeMatrix(plain)) {
            continue;
        }
        replaceNode(id, bakeNodeMatrix(plain, precision, loc.parents));
        changed = true;
    }

    if (changed) {
        commitHistory();
    }
}

/** Removes the transform attribute. Points stay where they are, so the element jumps. */
export function removeSelectionMatrices(ids: readonly string[]): void {
    let changed = false;

    for (const id of topmostIds(docState.doc, ids)) {
        const node = findNode(docState.doc, id)?.node;
        if (!node?.attrs.transform) {
            continue;
        }
        delete node.attrs.transform;
        changed = true;
    }

    if (changed) {
        commitHistory();
    }
}

/** Sets the same transform on every selected element. `undefined` removes it without moving points. */
export function writeSelectionMatrix(ids: readonly string[], text: string | undefined): void {
    let changed = false;

    for (const id of topmostIds(docState.doc, ids)) {
        const node = findNode(docState.doc, id)?.node;
        if (!node) {
            continue;
        }
        if (text === undefined) {
            if (!node.attrs.transform) {
                continue;
            }
            delete node.attrs.transform;
        } else if (node.attrs.transform !== text) {
            node.attrs.transform = text;
        } else {
            continue;
        }
        changed = true;
    }

    if (changed) {
        commitHistory({ mergeKey: `matrix:${ids.join(",")}` });
    }
}
