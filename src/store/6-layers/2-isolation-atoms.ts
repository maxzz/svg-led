import { type Getter, atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { type SvgDoc, type SvgNode, findNode, isCompoundPath } from "@/svg-core";
import { isolationScopeOf } from "@/tools/0-shared/4-group-units";
import { docState } from "../3-document";
import { isolatedGroupIdAtom, setSelectionAtom } from "../4-editor";

/** The Valtio document as a Jotai atom, so derived atoms update when the document changes */
export const docProxyAtom = atomWithProxy(docState);

/** Isolated ids that still name a node (undo or a reload can remove one) */
export function validIsolationScope(doc: SvgDoc, ids: readonly string[]): string[] {
    return ids.filter((id) => findNode(doc, id));
}

/** Isolated objects for event handlers; reads the live document, so it never lags behind an edit */
export function getIsolationScope(get: Getter): string[] {
    return validIsolationScope(docState.doc, get(isolatedGroupIdAtom));
}

/** True when both lists hold the same ids, ignoring order */
export function sameIsolationIds(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    const ids = new Set(b);
    return a.every((id) => ids.has(id));
}

/**
 * Nodes a marquee or Select all may pick: top-level elements, the children of an isolated group,
 * or the isolated objects themselves when they are not groups.
 */
export function isolationRootChildren(doc: SvgDoc, isolated: string | readonly string[] | null): SvgNode[] {
    const scope = isolationScopeOf(isolated);
    if (!scope.length) {
        return doc.children;
    }
    const nodes: SvgNode[] = [];
    for (const id of scope) {
        const node = findNode(doc, id)?.node;
        if (!node) {
            continue;
        }
        if (node.kind === 'g') {
            nodes.push(...node.children);
        } else {
            nodes.push(node);
        }
    }
    return nodes;
}

/**
 * The array new elements are appended to: the isolated group, the parent of an isolated object,
 * or the document when the isolated objects do not share a parent.
 */
export function isolationInsertSiblings(doc: SvgDoc, scope: readonly string[]): SvgNode[] {
    if (scope.length === 1) {
        const loc = findNode(doc, scope[0]);
        if (loc?.node.kind === 'g') {
            return loc.node.children;
        }
        if (loc) {
            return loc.siblings;
        }
    }
    if (scope.length > 1) {
        const locs = scope.flatMap((id) => {
            const loc = findNode(doc, id);
            return loc ? [loc] : [];
        });
        const parentId = locs[0] ? locs[0].parents.at(-1)?.id ?? null : undefined;
        if (locs.length && locs.every((loc) => (loc.parents.at(-1)?.id ?? null) === parentId)) {
            return locs[0].siblings;
        }
    }
    return doc.children;
}

/** Group id passed to insertionParent, or null for the document */
export function isolationInsertParentId(doc: SvgDoc, scope: readonly string[]): string | null {
    if (scope.length === 1) {
        const loc = findNode(doc, scope[0]);
        if (!loc) {
            return null;
        }
        return loc.node.kind === 'g' ? loc.node.id : loc.parents.at(-1)?.id ?? null;
    }
    if (scope.length > 1) {
        const parentIds = scope.map((id) => findNode(doc, id)?.parents.at(-1)?.id ?? null);
        return parentIds.every((id) => id === parentIds[0]) ? parentIds[0] : null;
    }
    return null;
}

/**
 * Ids that stay fully visible, and isolated groups whose whole contents stay visible.
 * Ancestors of an isolated object stay undimmed so a group's opacity does not fade the object inside it.
 */
export function isolationPaint(doc: SvgDoc, scope: readonly string[]): { keep?: string; open?: string; } {
    if (!scope.length) {
        return {};
    }
    const keep = new Set<string>();
    const open = new Set<string>();
    for (const id of scope) {
        const loc = findNode(doc, id);
        if (!loc) {
            continue;
        }
        for (const parent of loc.parents) {
            keep.add(parent.id);
        }
        keep.add(loc.node.id);
        if (loc.node.kind === 'g') {
            open.add(loc.node.id);
        }
    }
    return {
        keep: keep.size ? [...keep].join(' ') : undefined,
        open: open.size ? [...open].join(' ') : undefined,
    };
}

//---------------------------------------------------------------------------

/** Display name of a layer: the element's id attribute, or its kind as in Illustrator ("<Path>", "<Group>") */
export function layerName(node: SvgNode): string {
    if (node.attrs.id) {
        return node.attrs.id;
    }
    switch (node.kind) {
        case 'g': return '<Group>';
        case 'path': return isCompoundPath(node) ? '<Compound Path>' : '<Path>';
        case 'rect': return '<Rect>';
        case 'circle': return '<Circle>';
        case 'ellipse': return '<Ellipse>';
        case 'line': return '<Line>';
        case 'polyline': return '<Polyline>';
        case 'polygon': return '<Polygon>';
        case 'passthrough': return `<${node.tag}>`;
    }
}

export type IsolationLevel = { id: string; label: string; };

/** Groups from the outermost to the isolated object; one summary crumb when several objects are isolated */
export const isolationChainAtom = atom(
    (get): IsolationLevel[] => {
        const doc = get(docProxyAtom).doc as unknown as SvgDoc;
        const scope = validIsolationScope(doc, get(isolatedGroupIdAtom));
        if (scope.length === 1) {
            const loc = findNode(doc, scope[0]);
            return loc ? [...loc.parents, loc.node].map((n) => ({ id: n.id, label: layerName(n) })) : [];
        }
        return scope.length > 1 ? [{ id: '__isolation__', label: `${scope.length} objects` }] : [];
    }
);

/** Isolated objects for rendering (reactive to document changes) */
export const isolationScopeAtom = atom(
    (get): string[] => {
        const doc = get(docProxyAtom).doc as unknown as SvgDoc;
        return validIsolationScope(doc, get(isolatedGroupIdAtom));
    }
);

//---------------------------------------------------------------------------

/** Isolates the given objects: everything else is dimmed and cannot be picked. Clears the selection. */
export const enterIsolationAtom = atom(
    null,
    (_get, set, ids: string | readonly string[]) => {
        const scope = validIsolationScope(docState.doc, typeof ids === 'string' ? [ids] : ids);
        if (scope.length) {
            set(isolatedGroupIdAtom, scope);
            set(setSelectionAtom, []);
        }
    }
);

/** Leaves the current isolation for the parent group, or the top level. The object that was left becomes selected. Returns false when not isolated. */
export const exitIsolationLevelAtom = atom(
    null,
    (get, set): boolean => {
        const scope = getIsolationScope(get);
        if (!scope.length) {
            set(isolatedGroupIdAtom, []);
            return false;
        }
        if (scope.length > 1) {
            set(isolatedGroupIdAtom, []);
            set(setSelectionAtom, scope);
            return true;
        }
        const id = scope[0];
        const parent = findNode(docState.doc, id)?.parents.at(-1)?.id;
        set(isolatedGroupIdAtom, parent ? [parent] : []);
        set(setSelectionAtom, [id]);
        return true;
    }
);

/** Breadcrumbs: isolates one of the groups around the isolated object, or exits isolation when `target` is null */
export const exitIsolationToAtom = atom(
    null,
    (get, set, target: string | null) => {
        const scope = getIsolationScope(get);
        if (!scope.length || (scope.length === 1 && scope[0] === target)) {
            return;
        }
        if (scope.length > 1) {
            if (target) {
                return;
            }
            set(isolatedGroupIdAtom, []);
            set(setSelectionAtom, scope);
            return;
        }
        const id = scope[0];
        const loc = findNode(docState.doc, id);
        const chain = loc ? [...loc.parents.map((p) => p.id), id] : [];
        const index = target ? chain.indexOf(target) : -1;
        if (target && index < 0) {
            return;
        }
        set(isolatedGroupIdAtom, target ? [target] : []);
        set(setSelectionAtom, chain[index + 1] ? [chain[index + 1]] : []);
    }
);
