import { STORAGE_KEYS } from "./1-storage-keys";
import { atomWithStoredOptions } from "./2-atom-with-options";

/** Presentation attributes new shapes are drawn with. Stroke width and dash have their own atoms. */
export type LastStyle = {
    stroke: string;
    fill: string;
    linecap: string;
    linejoin: string;
    opacity: number;
};

/** Style last set in the properties palette (or by a drawing tool's style editor); new shapes use it */
export const lastStyleAtom = atomWithStoredOptions<LastStyle>(STORAGE_KEYS.style, {
    stroke: '#1e1e1e',
    fill: 'none',
    linecap: 'butt',
    linejoin: 'miter',
    opacity: 1,
});
