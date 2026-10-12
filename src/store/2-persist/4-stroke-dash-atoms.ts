import { atom } from "jotai";
import { STORAGE_KEYS } from "./1-storage-keys";
import { atomWithStoredOptions } from "./2-atom-with-options";
import { lastStrokeWidthAtom } from "./3-stroke-width-atoms";

export type DashStyle = 'solid' | 'dashed' | 'dotted' | 'custom';

/** Preset dash array for a stroke width; undefined for solid. */
export function presetDashArray(style: Exclude<DashStyle, 'custom'>, w: number): string | undefined {
    return style === 'solid' ? undefined : style === 'dashed' ? `${4 * w} ${3 * w}` : `${w} ${2 * w}`;
}

/** Canonical form of a dash array: numbers separated by single spaces ('' for solid) */
function canonicalDash(dash: string | undefined): string {
    return !dash || dash === 'none' ? '' : dash.split(/[\s,]+/).filter(Boolean).join(' ');
}

/** Dash setting that reproduces a shape's dash array: a preset when it matches one at this width, otherwise custom */
export function dashSettingFromArray(dash: string | undefined, w: number): { dashStyle: DashStyle; customDash: string; } {
    const text = canonicalDash(dash);
    if (!text) {
        return { dashStyle: 'solid', customDash: '' };
    }
    const preset = (['dashed', 'dotted'] as const).find((style) => canonicalDash(presetDashArray(style, w)) === text);
    return preset ? { dashStyle: preset, customDash: '' } : { dashStyle: 'custom', customDash: text };
}

/** Dash style last chosen in the properties palette, plus the last custom dash array text */
export const lastDashSettingAtom = atomWithStoredOptions(STORAGE_KEYS.strokeDash, {
    dashStyle: 'solid' as DashStyle,
    customDash: '',
});

/** Dash array new shapes are drawn with: presets follow the current stroke width; undefined for solid */
export const lastStrokeDashArrayAtom = atom((get) => {
    const { dashStyle, customDash } = get(lastDashSettingAtom);
    return dashStyle === 'custom' ? (customDash || undefined) : presetDashArray(dashStyle, get(lastStrokeWidthAtom));
});
