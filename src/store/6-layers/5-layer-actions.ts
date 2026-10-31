import { type Getter, atom } from "jotai";
import { type GroupNode, type SvgDoc, findNode, newNodeId, topmostIds } from "@/svg-core";
import { commitHistory, deleteNodes, docState, duplicateNodes, groupNodes } from "../3-document";
import { selectionAtom, setSelectionAtom } from "../4-editor";
import { isHidden, isLocked, setNodesHidden, setNodesLocked, showAll, unlockAll } from "./1-layer-attrs";
import { docProxyAtom, enterIsolationAtom, getIsolationScope, isolationInsertSiblings, sameIsolationIds } from "./2-isolation-atoms";

/** Selected ids that still exist, for enabled states (reactive to document changes) */
const liveSelectionAtom = atom(
    (get) => {
        const doc = get(docProxyAtom).doc as unknown as SvgDoc;
        return get(selectionAtom).filter((id) => findNode(doc, id));
    }
);

/** True when the selection can enter isolation: one or more objects, and not already exactly that isolation */
export function selectionCanIsolate(get: Getter): boolean {
    const ids = get(selectionAtom).filter((id) => findNode(docState.doc, id));
    return ids.length > 0 && !sameIsolationIds(ids, getIsolationScope(get));
}

export const canIsolateSelectionAtom = atom(
    (get) => {
        get(docProxyAtom);
        return selectionCanIsolate(get);
    }
);

export const hasLiveSelectionAtom = atom(
    (get) => get(liveSelectionAtom).length > 0
);

//---------------------------------------------------------------------------

/** New empty group above the topmost selected element (in that element's parent), or on top of the isolated group or the document */
export const newGroupAtom = atom(
    null,
    (get, set) => {
        const doc = docState.doc;
        const group: GroupNode = { id: newNodeId(), kind: 'g', attrs: {}, children: [] };

        const top = topmostIds(doc, get(selectionAtom))
            .map((id) => findNode(doc, id))
            .filter((l) => l !== undefined)
            .sort((a, b) => b.index - a.index)[0];
        if (top) {
            top.siblings.splice(top.index + 1, 0, group);
        } else {
            isolationInsertSiblings(doc, getIsolationScope(get)).push(group);
        }
        commitHistory();
        set(setSelectionAtom, [group.id]);
    }
);

export const groupSelectionAtom = atom(
    null,
    (get, set) => {
        const id = groupNodes(get(selectionAtom));
        id && set(setSelectionAtom, [id]);
    }
);

/** Enters isolation for every selected object. A group shows its contents; anything else stays as itself. */
export const isolateSelectionAtom = atom(
    null,
    (get, set) => {
        if (selectionCanIsolate(get)) {
            set(enterIsolationAtom, get(selectionAtom));
        }
    }
);

/** Copies the selection in place, right above the originals */
export const duplicateSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = duplicateNodes(get(selectionAtom));
        if (ids.length) {
            commitHistory();
            set(setSelectionAtom, ids);
        }
    }
);

export const deleteSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = get(selectionAtom);
        if (ids.length) {
            deleteNodes(ids);
            set(setSelectionAtom, []);
        }
    }
);

//---------------------------------------------------------------------------

/** Removes ids from the selection, e.g. after they were hidden or locked */
const deselectAtom = atom(
    null,
    (get, set, ids: readonly string[]) => {
        const sel = get(selectionAtom);
        const next = sel.filter((id) => !ids.includes(id));
        next.length !== sel.length && set(setSelectionAtom, next);
    }
);

/** Eye button of a layer row */
export const toggleHiddenAtom = atom(
    null,
    (_get, set, id: string) => {
        const node = findNode(docState.doc, id)?.node;
        if (!node) {
            return;
        }
        const hide = !isHidden(node);
        setNodesHidden([id], hide);
        hide && set(deselectAtom, [id]);
    }
);

/** Padlock button of a layer row */
export const toggleLockedAtom = atom(
    null,
    (_get, set, id: string) => {
        const node = findNode(docState.doc, id)?.node;
        if (!node) {
            return;
        }
        const lock = !isLocked(node);
        setNodesLocked([id], lock);
        lock && set(deselectAtom, [id]);
    }
);

export const hideSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = get(selectionAtom);
        setNodesHidden(ids, true);
        set(deselectAtom, ids);
    }
);

export const lockSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = get(selectionAtom);
        setNodesLocked(ids, true);
        set(deselectAtom, ids);
    }
);

/** Shows all hidden elements and selects them, as Illustrator's Show All */
export const showAllAtom = atom(
    null,
    (_get, set) => {
        const ids = showAll();
        ids.length && set(setSelectionAtom, ids);
    }
);

/** Unlocks all locked elements and selects them, as Illustrator's Unlock All */
export const unlockAllAtom = atom(
    null,
    (_get, set) => {
        const ids = unlockAll();
        ids.length && set(setSelectionAtom, ids);
    }
);
