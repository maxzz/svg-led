import { type Getter, atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { type SvgDoc, type SvgNode, findNode, isCompoundPath } from "@/svg-core";
import { docState } from "../3-document";
import { isolatedGroupIdAtom, setSelectionAtom } from "../4-editor";

/** The Valtio document as a Jotai atom, so derived atoms update when the document changes */
export const docProxyAtom = atomWithProxy(docState);

/** The isolated id when it still names a group of the document (undo or a reload can remove it) */
export function validIsolatedId(doc: SvgDoc, id: string | null): string | null {
    return id && findNode(doc, id)?.node.kind === 'g' ? id : null;
}

/** Isolated group for event handlers; reads the live document, so it never lags behind an edit */
export function getIsolatedId(get: Getter): string | null {
    return validIsolatedId(docState.doc, get(isolatedGroupIdAtom));
}

/** Children of the isolated group, or the top-level elements when nothing is isolated */
export function isolationRootChildren(doc: SvgDoc, isolatedId: string | null): SvgNode[] {
    const node = isolatedId ? findNode(doc, isolatedId)?.node : undefined;
    return node?.kind === 'g' ? node.children : doc.children;
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

/** Groups from the outermost to the isolated one; empty when not isolated */
export const isolationChainAtom = atom(
    (get): IsolationLevel[] => {
        const doc = get(docProxyAtom).doc as unknown as SvgDoc;
        const id = validIsolatedId(doc, get(isolatedGroupIdAtom));
        const loc = id ? findNode(doc, id) : undefined;
        return loc ? [...loc.parents, loc.node].map((n) => ({ id: n.id, label: layerName(n) })) : [];
    }
);

/** Isolated group id for rendering (reactive to document changes) */
export const isolatedIdAtom = atom(
    (get) => get(isolationChainAtom).at(-1)?.id ?? null
);

/**
 * The group that "Enter isolation mode" opens for a selected element: the element itself when it is a group,
 * otherwise the group it sits in. Null when there is none, or when that group is already isolated.
 */
export function isolationTargetOf(doc: SvgDoc, id: string, isolatedId: string | null): string | null {
    const loc = findNode(doc, id);
    if (!loc) {
        return null;
    }
    const group = loc.node.kind === 'g' ? loc.node : loc.parents.at(-1);
    return group?.kind === 'g' && group.id !== isolatedId ? group.id : null;
}

//---------------------------------------------------------------------------

/** Isolates a group: only its contents can be picked, the rest of the drawing is dimmed */
export const enterIsolationAtom = atom(
    null,
    (_get, set, id: string) => {
        if (validIsolatedId(docState.doc, id)) {
            set(isolatedGroupIdAtom, id);
            set(setSelectionAtom, []);
        }
    }
);

/** Leaves the isolated group for its parent group (or the top level); the group that was left becomes selected. Returns false when not isolated. */
export const exitIsolationLevelAtom = atom(
    null,
    (get, set): boolean => {
        const id = getIsolatedId(get);
        if (!id) {
            set(isolatedGroupIdAtom, null);
            return false;
        }
        const parents = findNode(docState.doc, id)?.parents ?? [];
        set(isolatedGroupIdAtom, parents.at(-1)?.id ?? null);
        set(setSelectionAtom, [id]);
        return true;
    }
);

/** Breadcrumbs: isolates one of the groups around the isolated one, or exits isolation when `target` is null */
export const exitIsolationToAtom = atom(
    null,
    (get, set, target: string | null) => {
        const id = getIsolatedId(get);
        if (!id || id === target) {
            return;
        }
        const loc = findNode(docState.doc, id);
        const chain = loc ? [...loc.parents.map((p) => p.id), id] : [];
        const index = target ? chain.indexOf(target) : -1;
        if (target && index < 0) {
            return;
        }
        set(isolatedGroupIdAtom, target);
        set(setSelectionAtom, chain[index + 1] ? [chain[index + 1]] : []);
    }
);
