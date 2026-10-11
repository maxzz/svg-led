import { atom } from "jotai";
import { STORAGE_KEYS } from "./1-storage-keys";
import { atomWithStoredOptions } from "./2-atom-with-options";

const strokeWidthOptionsAtom = atomWithStoredOptions(STORAGE_KEYS.strokeWidth, { strokeWidth: 1 });

/** Stroke width last chosen in the properties palette; new shapes are drawn with it */
export const lastStrokeWidthAtom = atom(
    (get) => get(strokeWidthOptionsAtom).strokeWidth,
    (_get, set, strokeWidth: number) => set(strokeWidthOptionsAtom, { strokeWidth }),
);
