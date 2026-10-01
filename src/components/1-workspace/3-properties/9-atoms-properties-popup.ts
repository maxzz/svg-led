import { atom } from "jotai";
import { activeToolIdAtom, selectionAtom } from "@/store/4-editor";
import { getTool } from "@/tools";

export type PropertiesMode = 'selection' | 'tool' | 'document';

/** Selected elements win; with an empty selection a drawing tool shows its style defaults, otherwise the document */
export const propertiesModeAtom = atom<PropertiesMode>(
    (get) => {
        if (get(selectionAtom).length) {
            return 'selection';
        }
        return getTool(get(activeToolIdAtom)).optionsAtom ? 'tool' : 'document';
    }
);

export const activeToolDefAtom = atom((get) => getTool(get(activeToolIdAtom)));

export const isPropertiesCollapsedAtom = atom(false);

export const togglePropertiesCollapsedAtom = atom(
    null,
    (get, set) => set(isPropertiesCollapsedAtom, !get(isPropertiesCollapsedAtom))
);
