import { STORAGE_KEYS } from "./1-storage-keys";
import { atomWithStoredOptions } from "./2-atom-with-options";

export type CornerRadius = { rx: number; ry: number; };

/** Corner radius last set on a rectangle; new rectangles get it, limited to their size */
export const lastCornerRadiusAtom = atomWithStoredOptions<CornerRadius>(STORAGE_KEYS.cornerRadius, { rx: 0, ry: 0 });
