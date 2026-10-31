import { type Getter } from "jotai";
import { type Matrix, type SvgNode, findNode } from "@/svg-core";
import { docState, insertSvgMarkup, insertionParent } from "../3-document";
import { getIsolationScope, isolationInsertParentId } from "./2-isolation-atoms";

/** Matrix from document coordinates to the coordinates of the group new elements go into (the isolated group, the parent of an isolated object, or the document) */
export function newElementMatrix(get: Getter): Matrix {
    return insertionParent(isolationInsertParentId(docState.doc, getIsolationScope(get))).docToLocal;
}

/** Puts a node, whose geometry is already in the target's coordinates (see newElementMatrix), on top of that group or the document */
export function insertNodeAtTop(get: Getter, node: SvgNode): void {
    insertionParent(isolationInsertParentId(docState.doc, getIsolationScope(get))).siblings.push(node);
}

/** Inserts pasted or dropped SVG markup on top of that group or the document; returns the new ids */
export function insertMarkupAtTop(get: Getter, text: string): string[] | undefined {
    return insertSvgMarkup(text, isolationInsertParentId(docState.doc, getIsolationScope(get)));
}

/** Removes a node wherever it is in the tree (no history commit) */
export function removeNode(id: string): void {
    const loc = findNode(docState.doc, id);
    loc?.siblings.splice(loc.index, 1);
}
