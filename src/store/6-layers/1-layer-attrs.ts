import { type SvgDoc, type SvgNode, findNode, getPresentation, setPresentation, walkNodes } from "@/svg-core";
import { commitHistory, docState, getNodeProxy } from "../3-document";

/** Editor-only attribute that marks a locked element; it is kept in the SVG so the lock survives saving */
export const LOCKED_ATTR = 'data-locked';

export function isHidden(node: SvgNode): boolean {
    return getPresentation(node.attrs, 'display')?.trim() === 'none';
}

export function isLocked(node: SvgNode): boolean {
    return node.attrs[LOCKED_ATTR] === 'true';
}

export type LayerState = {
    hidden: boolean;             // the node itself has display="none"
    locked: boolean;             // the node itself has data-locked="true"
    hiddenByParent: boolean;     // a group around the node is hidden
    lockedByParent: boolean;     // a group around the node is locked
};

export function layerState(doc: SvgDoc, id: string): LayerState | undefined {
    const loc = findNode(doc, id);
    if (!loc) {
        return;
    }
    return {
        hidden: isHidden(loc.node),
        locked: isLocked(loc.node),
        hiddenByParent: loc.parents.some(isHidden),
        lockedByParent: loc.parents.some(isLocked),
    };
}

/** The node or one of its groups is hidden or locked, so it cannot be picked on the canvas */
export function isHiddenOrLocked(doc: SvgDoc, id: string): boolean {
    const loc = findNode(doc, id);
    return !loc || [loc.node, ...loc.parents].some((n) => isHidden(n) || isLocked(n));
}

//---------------------------------------------------------------------------

export function setNodesHidden(ids: readonly string[], hidden: boolean): void {
    for (const id of ids) {
        const node = getNodeProxy(id);
        node && setPresentation(node.attrs, 'display', hidden ? 'none' : undefined);
    }
    ids.length && commitHistory();
}

export function setNodesLocked(ids: readonly string[], locked: boolean): void {
    for (const id of ids) {
        const node = getNodeProxy(id);
        if (!node) {
            continue;
        }
        if (locked) {
            node.attrs[LOCKED_ATTR] = 'true';
        } else {
            delete node.attrs[LOCKED_ATTR];
        }
    }
    ids.length && commitHistory();
}

/** Shows every hidden element; returns the ids that were hidden */
export function showAll(): string[] {
    const ids: string[] = [];
    walkNodes(docState.doc.children, (n) => { isHidden(n) && ids.push(n.id); });
    setNodesHidden(ids, false);
    return ids;
}

/** Unlocks every locked element; returns the ids that were locked */
export function unlockAll(): string[] {
    const ids: string[] = [];
    walkNodes(docState.doc.children, (n) => { isLocked(n) && ids.push(n.id); });
    setNodesLocked(ids, false);
    return ids;
}

export function hasHidden(doc: SvgDoc): boolean {
    let rv = false;
    walkNodes(doc.children, (n) => { rv ||= isHidden(n); });
    return rv;
}

export function hasLocked(doc: SvgDoc): boolean {
    let rv = false;
    walkNodes(doc.children, (n) => { rv ||= isLocked(n); });
    return rv;
}
