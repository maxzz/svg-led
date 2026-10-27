import { atom } from "jotai";
import { findNode } from "@/svg-core";
import { docState, redo, undo } from "../3-document";
import { isHiddenOrLocked } from "../6-layers/1-layer-attrs";
import { isolatedGroupIdAtom, selectedAnchorsAtom, selectionAtom } from "./2-selection-atoms";

/** Keeps only the selected ids that still exist (and are neither hidden nor locked) after the document was replaced; ends isolation of a removed group */
export const pruneSelectionAtom = atom(
    null,
    (get, set) => {
        const doc = docState.doc;
        const sel = get(selectionAtom);
        const next = sel.filter((id) => !isHiddenOrLocked(doc, id));
        if (next.length !== sel.length) {
            set(selectionAtom, next);
        }
        const isolated = get(isolatedGroupIdAtom);
        if (isolated && findNode(doc, isolated)?.node.kind !== 'g') {
            set(isolatedGroupIdAtom, null);
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
