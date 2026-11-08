import { type SvgDoc, type SvgNode, deactivatedName, findNode, getPresentation, setDefsChildrenActiveInMarkup, setDefsClassActiveInMarkup, setDefsDeclActiveInMarkup, setDefsElementActiveInMarkup, setPresentation, walkNodes } from "@/svg-core";
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

/** Writes the markup of a `<defs>` element after one of its items was turned on or off; one history step */
function writeDefsMarkup(defsId: string, change: (inner: string) => string): void {
    const node = getNodeProxy(defsId);
    if (node?.kind !== 'passthrough') {
        return;
    }
    const inner = change(node.inner);
    if (inner !== node.inner) {
        node.inner = inner;
        commitHistory();
    }
}

/** Turns a class of the `<style>` element `styleIndex` of a `<defs>` element on or off (its selector is renamed; see `setDefsClassActiveInMarkup`) */
export function setDefsClassActive(defsId: string, styleIndex: number, name: string, active: boolean): void {
    writeDefsMarkup(defsId, (inner) => setDefsClassActiveInMarkup(inner, styleIndex, name, active));
}

/** Turns one declaration of a class on or off (it is commented out; see `setDefsDeclActiveInMarkup`) */
export function setDefsDeclActive(defsId: string, styleIndex: number, name: string, declIndex: number, active: boolean): void {
    writeDefsMarkup(defsId, (inner) => setDefsDeclActiveInMarkup(inner, styleIndex, name, declIndex, active));
}

/** Turns an element of a `<defs>` element on or off (its tag is renamed; see `setDefsElementActiveInMarkup`) */
export function setDefsElementActive(defsId: string, index: number, active: boolean): void {
    writeDefsMarkup(defsId, (inner) => setDefsElementActiveInMarkup(inner, index, active));
}

/**
 * Turns every direct child of a `<defs>` element on or off (see `setDefsChildrenActiveInMarkup`), one history step.
 * The `<defs>` tag stays `defs`; a tag renamed by an earlier version is set back.
 */
export function setDefsChildrenActive(defsId: string, active: boolean): void {
    const node = getNodeProxy(defsId);
    if (node?.kind !== 'passthrough') {
        return;
    }
    const inner = setDefsChildrenActiveInMarkup(node.inner, active);
    const tag = deactivatedName(node.tag, false);
    if (inner !== node.inner || tag !== node.tag) {
        node.inner = inner;
        node.tag = tag;
        commitHistory();
    }
}

/** Turns a passthrough element on or off by renaming its tag, such as `<defs>` (the layers panel shows its state in the eye) */
export function setPassthroughActive(id: string, active: boolean): void {
    const node = getNodeProxy(id);
    if (node?.kind !== 'passthrough') {
        return;
    }
    const tag = deactivatedName(node.tag, !active);
    if (tag !== node.tag) {
        node.tag = tag;
        commitHistory();
    }
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
