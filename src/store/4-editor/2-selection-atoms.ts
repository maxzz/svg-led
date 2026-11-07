import { atom } from "jotai";

/** Selected node ids (internal ids, see SvgNode.id) */
export const selectionAtom = atom<string[]>([]);

const noIsolation: readonly string[] = [];

/**
 * Isolation levels, outermost first. Each frame is the objects isolated at that level.
 * The last frame is the active scope. Entering isolation again pushes a frame; a breadcrumb
 * click pops back to that frame instead of leaving every level.
 */
export const isolationStackAtom = atom<readonly (readonly string[])[]>([]);

/**
 * Objects in the active isolation level, or empty. Isolation logic lives in store/6-layers.
 * One group shows its children; any other object, or several objects, stay editable while the rest of the drawing is dimmed.
 */
export const isolatedGroupIdAtom = atom((get): readonly string[] => get(isolationStackAtom).at(-1) ?? noIsolation);

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

//---------------------------------------------------------------------------

/**
 * Elements inside `<defs>` selected in the layers tree or from the code (ids from `defsElementId`).
 * They are not document nodes, so they are kept apart from `selectionAtom`, which the canvas and the panels read as nodes.
 */
export const defsSelectionAtom = atom<string[]>([]);

export const setSelectionAtom = atom(
    null,
    (_get, set, ids: string[]) => {
        set(selectionAtom, ids);
        set(selectedAnchorsAtom, []);
        set(defsSelectionAtom, []);
    }
);

/** Selects only elements inside `<defs>`; clears the ordinary selection */
export const setDefsSelectionAtom = atom(
    null,
    (_get, set, ids: string[]) => {
        set(setSelectionAtom, []);
        set(defsSelectionAtom, ids);
    }
);