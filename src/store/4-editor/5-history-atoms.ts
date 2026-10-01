import { atom } from "jotai";
import { allNodeIds } from "@/svg-core";
import { docState, redo, undo } from "../3-document";
import { selectedAnchorsAtom, selectionAtom } from "./2-selection-atoms";

/** Keeps only the selected ids that still exist after the document was replaced */
export const pruneSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = allNodeIds(docState.doc);
        const sel = get(selectionAtom);
        const next = sel.filter((id) => ids.has(id));
        if (next.length !== sel.length) {
            set(selectionAtom, next);
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
