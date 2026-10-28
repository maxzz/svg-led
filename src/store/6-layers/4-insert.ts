import { type Getter } from "jotai";
import { type Matrix, type SvgNode, findNode } from "@/svg-core";
import { docState, insertSvgMarkup, insertionParent } from "../3-document";
import { getIsolatedId } from "./2-isolation-atoms";

/** Matrix from document coordinates to the coordinates of the group new elements go into (the isolated group or the document) */
export function newElementMatrix(get: Getter): Matrix {
    return insertionParent(getIsolatedId(get)).docToLocal;
}

/** Puts a node, whose geometry is already in the target's coordinates (see newElementMatrix), on top of the isolated group or the document */
export function insertNodeAtTop(get: Getter, node: SvgNode): void {
    insertionParent(getIsolatedId(get)).siblings.push(node);
}

/** Inserts pasted or dropped SVG markup on top of the isolated group or the document; returns the new ids */
export function insertMarkupAtTop(get: Getter, text: string): string[] | undefined {
    return insertSvgMarkup(text, getIsolatedId(get));
}

/** Removes a node wherever it is in the tree (no history commit) */
export function removeNode(id: string): void {
    const loc = findNode(docState.doc, id);
    loc?.siblings.splice(loc.index, 1);
}
