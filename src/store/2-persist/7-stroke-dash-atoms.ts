export type DashStyle = 'solid' | 'dashed' | 'dotted' | 'custom';

/** Preset dash array for a stroke width; undefined for solid. */
export function presetDashArray(style: Exclude<DashStyle, 'custom'>, w: number): string | undefined {
    return style === 'solid' ? undefined : style === 'dashed' ? `${4 * w} ${3 * w}` : `${w} ${2 * w}`;
}

/** Dash array a new shape is drawn with: presets follow the stroke width; undefined for solid */
export function newShapeDashArray(dashStyle: DashStyle, customDash: string, strokeWidth: number): string | undefined {
    return dashStyle === 'custom' ? (customDash || undefined) : presetDashArray(dashStyle, strokeWidth);
}
