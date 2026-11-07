import { atom } from "jotai";
import { docState, redo, undo } from "../3-document";
import { isHiddenOrLocked } from "../6-layers/1-layer-attrs";
import { pruneIsolationStack } from "../6-layers/2-isolation-atoms";
import { defsSelectionAtom, isolationStackAtom, selectedAnchorsAtom, selectionAtom } from "./2-selection-atoms";
import { isDefsItemOf } from "@/svg-core";

/** Keeps only the selected ids that still exist (and are neither hidden nor locked) after the document was replaced; drops isolated objects that are gone */
export const pruneSelectionAtom = atom(
    null,
    (get, set) => {
        const doc = docState.doc;
        const sel = get(selectionAtom);
        const next = sel.filter((id) => !isHiddenOrLocked(doc, id));
        if (next.length !== sel.length) {
            set(selectionAtom, next);
        }
        const defsSel = get(defsSelectionAtom);
        const defsNext = defsSel.filter((id) => isDefsItemOf(doc, id));
        if (defsNext.length !== defsSel.length) {
            set(defsSelectionAtom, defsNext);
        }
        const stack = get(isolationStackAtom);
        const pruned = pruneIsolationStack(doc, stack);
        if (pruned !== stack) {
            set(isolationStackAtom, pruned);
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
