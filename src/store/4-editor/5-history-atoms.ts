import { atom } from "jotai";
import { allNodeIds } from "@/svg-core";
import { docState, redo, undo } from "../3-document";
import { editingGroupIdAtom, selectedAnchorsAtom, selectionAtom } from "./2-selection-atoms";

/** Keeps only the selected ids that still exist after the document was replaced; ends group editing of a removed group */
export const pruneSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = allNodeIds(docState.doc);
        const sel = get(selectionAtom);
        const next = sel.filter((id) => ids.has(id));
        if (next.length !== sel.length) {
            set(selectionAtom, next);
        }
        const editing = get(editingGroupIdAtom);
        if (editing && !ids.has(editing)) {
            set(editingGroupIdAtom, null);
        }
        set(selectedAnchorsAtom, []);
    }
);

export const undoAtom = atom(
    null,
    (_get, set) => {
        undo() && set(pruneSelectionAtom);
    }
);

export const redoAtom = atom(
    null,
    (_get, set) => {
        redo() && set(pruneSelectionAtom);
    }
);
