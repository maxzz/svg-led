import { useSetAtom } from "jotai";

import { setNodesPresentation } from "@/store/3-document";
import { type NewShapeStyle, newShapeStyleAtom } from "@/store/2-persist";
import { type SectionMode } from "./9-registry";

export type StyleWriter = {
    /** Changes an attribute of the selected elements. Ignored in the new-shape panel. */
    selection: (prop: string, value: string | undefined) => void;
    /** Changes the properties new shapes are created with. Ignored for a selection. */
    defaults: (patch: Partial<NewShapeStyle>) => void;
};

/**
 * Sections edit either the selection or the new-shape style, depending on the mode.
 * Each change calls both; the call for the other target does nothing, so the selection never touches the defaults.
 */
export function useStyleWriter(mode: SectionMode, ids: string[]): StyleWriter {
    const setDefaults = useSetAtom(newShapeStyleAtom);
    return {
        selection(prop, value) {
            if (mode === 'selection') {
                setNodesPresentation(ids, prop, value);
            }
        },
        defaults(patch) {
            if (mode === 'newShape') {
                setDefaults(patch);
            }
        },
    };
}
