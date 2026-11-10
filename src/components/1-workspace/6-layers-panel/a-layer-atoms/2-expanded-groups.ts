import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { type DefsItem, type SvgNode, defsItemId, defsItemsOf, plainName } from "@/svg-core";
import { isolationCollapsedAtom, isolationManyOpenAtom } from "@/store/6-layers";

//---------------------------------------------------------------------------
// Expanded groups

export const expandedIdsAtom = atom<ReadonlySet<string>>(new Set<string>());

export const isExpandedFamily = atomFamily(
    (id: string) => atom((get) => get(expandedIdsAtom).has(id))
);

export const toggleExpandedAtom = atom(
    null,
    (get, set, id: string) => {
        const next = new Set(get(expandedIdsAtom));
        next.has(id) ? next.delete(id) : next.add(id);
        set(expandedIdsAtom, next);
    }
);

//---------------------------------------------------------------------------
// Isolation Mode expansion

/** True when this isolated object was collapsed in the current isolation */
export const isIsolationCollapsedFamily = atomFamily(
    (id: string) => atom((get) => get(isolationCollapsedAtom).has(id))
);

export const toggleIsolationCollapsedAtom = atom(
    null,
    (get, set, id: string) => {
        const next = new Set(get(isolationCollapsedAtom));
        next.has(id) ? next.delete(id) : next.add(id);
        set(isolationCollapsedAtom, next);
    }
);

/** Collapse or expand the Isolation Mode row that holds several isolated objects */
export const toggleIsolationManyAtom = atom(
    null,
    (get, set) => {
        set(isolationManyOpenAtom, !get(isolationManyOpenAtom));
    }
);

//---------------------------------------------------------------------------
// Subtree expansion (Ctrl+click on an expander)

/** Ids of the `<defs>` items with children, at any depth, appended to `out` */
export function defsExpandableIds(defsId: string, items: readonly DefsItem[], out: string[] = []): string[] {
    for (const item of items) {
        if (item.kind === 'element' && item.children.length) {
            out.push(defsItemId(defsId, item.part));
            defsExpandableIds(defsId, item.children, out);
        }
    }
    return out;
}

const isDefsNode = (node: SvgNode): node is Extract<SvgNode, { kind: 'passthrough'; }> => node.kind === 'passthrough' && plainName(node.tag).toLowerCase() === 'defs';

/** Ids of the groups, `<defs>` elements and `<defs>` items under a node, at any depth (the node itself is not included) */
export function expandableDescendantIds(node: SvgNode, out: string[] = []): string[] {
    if (node.kind === 'g') {
        for (const child of node.children) {
            if (child.kind === 'g' || isDefsNode(child)) {
                out.push(child.id);
            }
            expandableDescendantIds(child, out);
        }
    } else if (isDefsNode(node)) {
        defsExpandableIds(node.id, defsItemsOf(node.inner), out);
    }
    return out;
}

/**
 * Opens or closes a row and every expandable row under it (Ctrl+click on an expander).
 * `root` marks the isolated object whose open state is kept in `isolationCollapsedAtom`.
 */
export const setSubtreeOpenAtom = atom(
    null,
    (get, set, { id, root, open, ids }: { id: string; root: boolean; open: boolean; ids: string[]; }) => {
        const expanded = new Set(get(expandedIdsAtom));
        for (const d of ids) {
            open ? expanded.add(d) : expanded.delete(d);
        }
        if (root) {
            const collapsed = new Set(get(isolationCollapsedAtom));
            open ? collapsed.delete(id) : collapsed.add(id);
            set(isolationCollapsedAtom, collapsed);
        } else {
            open ? expanded.add(id) : expanded.delete(id);
        }
        set(expandedIdsAtom, expanded);
    }
);
