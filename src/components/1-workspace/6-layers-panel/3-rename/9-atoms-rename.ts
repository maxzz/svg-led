import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { toast } from "sonner";
import { findNode } from "@/svg-core";
import { docState } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { renameLayer } from "@/store/7-layers-edit";
import { locateSelectionAtom } from "../9-atoms-layers-panel";

/** Row whose name is being edited */
export const renamingIdAtom = atom<string | null>(null);

/** Why the last Enter was refused; shown on the name field until the next try */
export const renameErrorAtom = atom<string | null>(null);

export const isRenamingFamily = atomFamily(
    (id: string) => atom((get) => get(renamingIdAtom) === id)
);

export const startRenameAtom = atom(
    null,
    (_get, set, id: string) => {
        if (findNode(docState.doc, id)) {
            set(renameErrorAtom, null);
            set(renamingIdAtom, id);
        }
    }
);

/** F2: opens the panel at the single selected layer and starts editing its name */
export const renameSelectionAtom = atom(
    null,
    (get, set) => {
        const selection = get(selectionAtom);
        if (selection.length === 1) {
            set(locateSelectionAtom);
            set(startRenameAtom, selection[0]);
        }
    }
);

/** Enter: applies the name; an invalid name keeps the field open and reports why. Returns true when the field can close. */
export const commitRenameAtom = atom(
    null,
    (get, set, text: string): boolean => {
        const id = get(renamingIdAtom);
        if (!id) {
            return true;
        }
        const rv = renameLayer(id, text);
        if (!rv.ok) {
            set(renameErrorAtom, rv.error);
            toast.error(rv.error, { id: RENAME_TOAST_ID });
            return false;
        }
        set(cancelRenameAtom);
        return true;
    }
);

/** Focus left the field: applies the name, or drops an invalid one, since the field cannot stay open */
export const blurRenameAtom = atom(
    null,
    (get, set, text: string) => {
        if (get(renamingIdAtom) && !set(commitRenameAtom, text)) {
            set(cancelRenameAtom);
        }
    }
);

const RENAME_TOAST_ID = 'layer-rename';

export const cancelRenameAtom = atom(
    null,
    (_get, set) => {
        set(renamingIdAtom, null);
        set(renameErrorAtom, null);
    }
);
