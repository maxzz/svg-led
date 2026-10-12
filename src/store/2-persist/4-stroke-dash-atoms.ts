import { atom } from "jotai";
import { STORAGE_KEYS } from "./1-storage-keys";
import { atomWithStoredOptions } from "./2-atom-with-options";
import { lastStrokeWidthAtom } from "./3-stroke-width-atoms";

export type DashStyle = 'solid' | 'dashed' | 'dotted' | 'custom';

/** Preset dash array for a stroke width; undefined for solid. */
export function presetDashArray(style: Exclude<DashStyle, 'custom'>, w: number): string | undefined {
    return style === 'solid' ? undefined : style === 'dashed' ? `${4 * w} ${3 * w}` : `${w} ${2 * w}`;
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
