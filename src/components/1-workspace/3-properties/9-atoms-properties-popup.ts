import { atom } from "jotai";
import { activeToolIdAtom, selectionAtom } from "@/store/4-editor";
import { getTool } from "@/tools";

export type PropertiesMode = 'selection' | 'tool' | 'document';

/**
 * A creation tool shows the properties new shapes are created with, even while something is selected.
 * Otherwise the selection is shown, or the document when nothing is selected.
 */
export const propertiesModeAtom = atom<PropertiesMode>(
    (get) => {
        if (getTool(get(activeToolIdAtom)).newShapeKind) {
            return 'tool';
        }
        return get(selectionAtom).length ? 'selection' : 'document';
    }
);

export const activeToolDefAtom = atom(
    (get) => getTool(get(activeToolIdAtom))
);

export const isPropertiesCollapsedAtom = atom(false);

export const togglePropertiesCollapsedAtom = atom(
    null,
    (get, set) => set(isPropertiesCollapsedAtom, !get(isPropertiesCollapsedAtom))
);
