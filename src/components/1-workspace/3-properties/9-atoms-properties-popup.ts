import { atom } from "jotai";
import { activeToolIdAtom, selectionAtom } from "@/store/4-editor";
import { getTool } from "@/tools";

/** `null` means the popup is hidden (nothing selected and no creation tool active) */
export type PropertiesMode = 'selection' | 'tool' | null;

/**
 * A creation tool shows the properties new shapes are created with, even while something is selected.
 * Otherwise the selection is shown, or nothing when nothing is selected.
 * Document info (file name, size attributes, viewBox) lives in the ViewBox settings dialog.
 */
export const propertiesModeAtom = atom<PropertiesMode>(
    (get) => {
        if (getTool(get(activeToolIdAtom)).newShapeKind) {
            return 'tool';
        }
        return get(selectionAtom).length ? 'selection' : null;
    }
);

export const activeToolDefAtom = atom(
    (get) => getTool(get(activeToolIdAtom))
);

/** Canvas pixels from the left edge that the floating popup covers: `left-3` (12px) + `w-[200px]` (200px). Keep in sync with `PropertiesPopup`. (It should be 197 but I rounded it up to 200 to avoid floating pixels.) */
export const PROPERTIES_POPUP_RIGHT_EDGE_PX = 12 + 200;

export const isPropertiesCollapsedAtom = atom(false);

export const togglePropertiesCollapsedAtom = atom(
    null,
    (get, set) => set(isPropertiesCollapsedAtom, !get(isPropertiesCollapsedAtom))
);
