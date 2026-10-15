import { LEGACY_STYLE_KEYS, STORAGE_KEYS } from "./1-storage-keys";
import { atomWithStoredOptions } from "./2-atom-with-options";
import { type DashStyle } from "./4-stroke-dash-atoms";

export type CornerRadius = { rx: number; ry: number; };

/**
 * Every property a new shape can be created with. One object serves all creation tools;
 * each tool shows and uses only the properties that apply to the shape it creates.
 */
export type NewShapeStyle = {
    stroke: string;
    fill: string;
    strokeWidth: number;
    dashStyle: DashStyle;
    customDash: string;
    linecap: string;
    linejoin: string;
    miterlimit: number;
    opacity: number;
    rx: number;
    ry: number;
};

/** SVG default for stroke-miterlimit */
export const DEFAULT_MITER_LIMIT = 4;

export const NEW_SHAPE_STYLE_DEFAULTS: NewShapeStyle = {
    stroke: '#1e1e1e',
    fill: 'none',
    strokeWidth: 1,
    dashStyle: 'solid',
    customDash: '',
    linecap: 'butt',
    linejoin: 'miter',
    miterlimit: DEFAULT_MITER_LIMIT,
    opacity: 1,
    rx: 0,
    ry: 0,
};

/** Properties new shapes are created with. Independent of the selection; changed only in the new-shape panel. */
export const newShapeStyleAtom = atomWithStoredOptions<NewShapeStyle>(STORAGE_KEYS.newShape, migrateLegacyStyle());

/**
 * Values saved by the per-property atoms are carried over once, the first time the new key is missing.
 * The returned object is the starting point; the atom merges the stored new key over it.
 */
function migrateLegacyStyle(): NewShapeStyle {
    const defaults = { ...NEW_SHAPE_STYLE_DEFAULTS };
    try {
        if (localStorage.getItem(STORAGE_KEYS.newShape) !== null) {
            return defaults;
        }
        const migrated: NewShapeStyle = {
            ...defaults,
            ...readLegacy(LEGACY_STYLE_KEYS.style),
            ...readLegacy(LEGACY_STYLE_KEYS.strokeWidth),
            ...readLegacy(LEGACY_STYLE_KEYS.strokeDash),
            ...readLegacy(LEGACY_STYLE_KEYS.cornerRadius),
        };
        localStorage.setItem(STORAGE_KEYS.newShape, JSON.stringify(migrated));
        for (const key of Object.values(LEGACY_STYLE_KEYS)) {
            localStorage.removeItem(key);
        }
        return migrated;
    } catch (e) {
        console.error('Failed to migrate saved shape style', e);
        return defaults;
    }
}

function readLegacy(key: string): Partial<NewShapeStyle> {
    const stored = localStorage.getItem(key);
    if (!stored) {
        return {};
    }
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
}
