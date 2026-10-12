import { atom } from "jotai";
import { groupPathIds } from "@/svg-core";
import { docState } from "../3-document";

/** Selected node ids (internal ids, see SvgNode.id) */
export const selectionAtom = atom<string[]>([]);

/**
 * Group being edited (see SvgNode.id of a group), or null.
 * While set, a click selects the children of this group one by one instead of the whole group.
 */
export const editingGroupIdAtom = atom<string | null>(null);

/**
 * Selected anchors and shape handles in points mode.
 * Key: "<nodeId>|<si>:<ai>" for path anchors, "<nodeId>|h:<handle>" for native shape handles.
 */
export const selectedAnchorsAtom = atom<string[]>([]);

export const hoverNodeIdAtom = atom<string | null>(null);

export const hasSelectionAtom = atom(
    (get) => get(selectionAtom).length > 0
);

export function nodeAnchorKey(nodeId: string, key: string): string {
    return `${nodeId}|${key}`;
}

export function splitNodeAnchorKey(full: string): [nodeId: string, key: string] {
    const i = full.indexOf('|');
    return [full.slice(0, i), full.slice(i + 1)];
}

/** Anchor keys of one node from the selection */
export function anchorsOfNode(selected: readonly string[], nodeId: string): Set<string> {
    const rv = new Set<string>();
    for (const full of selected) {
        const [id, key] = splitNodeAnchorKey(full);
        if (id === nodeId) {
            rv.add(key);
        }
    }
    return rv;
}

export const setSelectionAtom = atom(
    null,
    (_get, set, ids: string[]) => {
        set(selectionAtom, ids);
        set(selectedAnchorsAtom, []);
    }
);

/** Escape while editing a group: leave the group for its parent group (or the top level), which becomes selected */
export const exitGroupEditingAtom = atom(
    null,
    (get, set) => {
        const editing = get(editingGroupIdAtom);
        if (!editing) {
            return;
        }
        const path = groupPathIds(docState.doc, editing);
        set(editingGroupIdAtom, path.length ? path[path.length - 1] : null);
        set(setSelectionAtom, [editing]);
    }
);
