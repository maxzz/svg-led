import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { type DefsItem, defsItemId, defsItemsOf, findNode, parseDefsItemId } from "@/svg-core";
import { docState } from "@/store/3-document";
import { defsSelectionAtom, selectionAtom } from "@/store/4-editor";

//---------------------------------------------------------------------------
// Selected rows and the markers of their ancestors

export const isSelectedFamily = atomFamily(
    (id: string) => atom((get) => get(selectionAtom).includes(id))
);

/** Ids of every group that holds a selected item at any depth, whether it is collapsed or not; a selected `<defs>` item counts its `<defs>` element and that element's parents */
const selectedAncestorIdsAtom = atom((get) => {
    const ids = new Set<string>();
    for (const id of get(selectionAtom)) {
        for (const p of findNode(docState.doc, id)?.parents ?? []) {
            ids.add(p.id);
        }
    }
    for (const id of get(defsSelectionAtom)) {
        const defsId = parseDefsItemId(id)?.defsId;
        if (!defsId) {
            continue;
        }
        ids.add(defsId);
        for (const p of findNode(docState.doc, defsId)?.parents ?? []) {
            ids.add(p.id);
        }
    }
    return ids;
});

/** True when a group row should show the marker that its contents are selected */
export const containsSelectedFamily = atomFamily(
    (id: string) => atom((get) => get(selectedAncestorIdsAtom).has(id))
);

/**
 * The item ids (of `defsItemId`) on the way from the `<defs>` items to the one with `part`, outermost first;
 * undefined when no item has that part
 */
export function defsAncestorIdsOf(defsId: string, items: readonly DefsItem[], part: string, trail: string[] = []): string[] | undefined {
    for (const item of items) {
        if (item.part === part) {
            return trail;
        }
        if (item.kind === 'element') {
            const found = defsAncestorIdsOf(defsId, item.children, part, [...trail, defsItemId(defsId, item.part)]);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

/** Ids of the `<defs>` items that hold a selected `<defs>` item at any depth */
const selectedDefsAncestorIdsAtom = atom((get) => {
    const ids = new Set<string>();
    for (const id of get(defsSelectionAtom)) {
        const parsed = parseDefsItemId(id);
        const node = parsed && findNode(docState.doc, parsed.defsId)?.node;
        if (!parsed || node?.kind !== 'passthrough') {
            continue;
        }
        for (const a of defsAncestorIdsOf(parsed.defsId, defsItemsOf(node.inner), parsed.part) ?? []) {
            ids.add(a);
        }
    }
    return ids;
});

/** True when a `<defs>` item (a `<style>` or other element) should show the marker that a selected item is inside it */
export const containsSelectedDefsFamily = atomFamily(
    (id: string) => atom((get) => get(selectedDefsAncestorIdsAtom).has(id))
);
