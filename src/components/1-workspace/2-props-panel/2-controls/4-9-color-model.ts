import { ColorSpace, parse, spaces, to } from "colorjs.io/fn";
import { fmtNum } from "@/svg-core";

// The functional build of Color.js registers no spaces, so parse() knows no CSS syntax until they are registered.
for (const space of Object.values(spaces)) {
    ColorSpace.register(space);
}

export type ColorModelId = 'hex' | 'rgb' | 'hsl' | 'hwb' | 'lab' | 'lch' | 'oklab' | 'oklch';

/** A color in HSV: `h` in degrees, `s`, `v` and `a` in 0..1. The picker's area and bars edit this form. */
export type Hsv = { h: number; s: number; v: number; a: number; };

export type Triple = [number, number, number];

type Field = { label: string; precision: number; min?: number; max?: number; unit?: string; };

type ModelDef = {
    label: string;
    /** Color.js space the model's values are read from and written to */
    space: string;
    /** CSS function name; hex has none */
    fn?: string;
    fields: readonly [Field, Field, Field];
};

/** Notations the picker can write. Values are in display units: CSS units, except rgb and hex, which use 0..255. */
export const COLOR_MODELS: Record<ColorModelId, ModelDef> = {
    hex: {
        label: 'HEX',
        space: 'srgb',
        fields: [
            { label: 'R', precision: 0, min: 0, max: 255 },
            { label: 'G', precision: 0, min: 0, max: 255 },
            { label: 'B', precision: 0, min: 0, max: 255 },
        ],
    },
    rgb: {
        label: 'RGB',
        space: 'srgb',
        fn: 'rgb',
        fields: [
            { label: 'R', precision: 0, min: 0, max: 255 },
            { label: 'G', precision: 0, min: 0, max: 255 },
            { label: 'B', precision: 0, min: 0, max: 255 },
        ],
    },
    hsl: {
        label: 'HSL',
        space: 'hsl',
        fn: 'hsl',
        fields: [
            { label: 'H', precision: 0, min: 0, max: 360 },
            { label: 'S', precision: 1, min: 0, max: 100, unit: '%' },
            { label: 'L', precision: 1, min: 0, max: 100, unit: '%' },
        ],
    },
    hwb: {
        label: 'HWB',
        space: 'hwb',
        fn: 'hwb',
        fields: [
            { label: 'H', precision: 0, min: 0, max: 360 },
            { label: 'W', precision: 1, min: 0, max: 100, unit: '%' },
            { label: 'B', precision: 1, min: 0, max: 100, unit: '%' },
        ],
    },
    lab: {
        label: 'LAB',
        space: 'lab',
        fn: 'lab',
        fields: [
            { label: 'L', precision: 1, min: 0, max: 100 },
            { label: 'a', precision: 1 },
            { label: 'b', precision: 1 },
        ],
    },
    lch: {
        label: 'LCH',
        space: 'lch',
        fn: 'lch',
        fields: [
            { label: 'L', precision: 1, min: 0, max: 100 },
            { label: 'C', precision: 1, min: 0 },
            { label: 'H', precision: 1, min: 0, max: 360 },
        ],
    },
    oklab: {
        label: 'OKLAB',
        space: 'oklab',
        fn: 'oklab',
        fields: [
            { label: 'L', precision: 3, min: 0, max: 1 },
            { label: 'a', precision: 3 },
            { label: 'b', precision: 3 },
        ],
    },
    oklch: {
        label: 'OKLCH',
        space: 'oklch',
        fn: 'oklch',
        fields: [
            { label: 'L', precision: 3, min: 0, max: 1 },
            { label: 'C', precision: 3, min: 0 },
            { label: 'H', precision: 1, min: 0, max: 360 },
        ],
    },
};

const FN_MODELS = new Map<string, ColorModelId>([
    ['rgb', 'rgb'], ['rgba', 'rgb'],
    ['hsl', 'hsl'], ['hsla', 'hsl'],
    ['hwb', 'hwb'],
    ['lab', 'lab'],
    ['lch', 'lch'],
    ['oklab', 'oklab'],
    ['oklch', 'oklch'],
]);

/** Notation a CSS color is written in, so edits keep it. Hex for `#…`, named colors and anything unrecognized. */
export function modelOf(css: string): ColorModelId {
    const fn = /^\s*([a-z]+)\(/i.exec(css)?.[1].toLowerCase();
    return (fn && FN_MODELS.get(fn)) || 'hex';
}

/** Display values of any CSS color, or null when the text is not a color (`none`, `''`, `url(…)`). */
export function valuesOf(css: string, model: ColorModelId): Triple | null {
    const parsed = parseOrNull(css);
    if (!parsed) {
        return null;
    }
    return displayValues(to(parsed, COLOR_MODELS[model].space).coords, model);
}

/** Display values of an HSV color */
export function modelValues(hsv: Hsv, model: ColorModelId): Triple {
    const rgb = hsvToRgb(hsv);
    return displayValues(to({ spaceId: 'srgb', coords: rgb, alpha: hsv.a }, COLOR_MODELS[model].space).coords, model);
}

/**
 * HSV of a CSS color. Text that is not a color reads as opaque black.
 * The hue is kept when the color is achromatic, so dragging to gray doesn't make the hue jump.
 */
export function hsvOf(css: string, hue: number): Hsv {
    const parsed = parseOrNull(css);
    if (!parsed) {
        return { h: hue, s: 0, v: 0, a: 1 };
    }
    const { coords, alpha } = to(parsed, 'srgb');
    const rgb = [0, 1, 2].map((i) => clamp01(finiteOr(coords[i], 0))) as Triple;
    const hsv = rgbToHsv(rgb);
    return { h: hsv.s === 0 ? hue : hsv.h, s: hsv.s, v: hsv.v, a: finiteOr(alpha, 1) };
}

/** CSS text of an HSV color written in the given notation */
export function formatHsv(hsv: Hsv, model: ColorModelId): string {
    return formatColor(model, modelValues(hsv, model), hsv.a);
}

/**
 * CSS text of display values. Hex is `#rrggbb`, plus `aa` when translucent.
 * Functions use the modern space-separated syntax with `/ alpha`, which is omitted when opaque.
 */
export function formatColor(model: ColorModelId, values: Triple, alpha: number): string {
    const def = COLOR_MODELS[model];
    const translucent = alpha < 1;
    if (model === 'hex') {
        return `#${values.map(hexByte).join('')}${translucent ? hexByte(alpha * 255) : ''}`;
    }
    const args = values.map((n, i) => fmtNum(n, def.fields[i].precision) + (def.fields[i].unit ?? ''));
    return `${def.fn}(${args.join(' ')}${translucent ? ` / ${fmtNum(alpha, 3)}` : ''})`;
}

//---------------------------------------------------------------------------

function parseOrNull(css: string) {
    try {
        return parse(css);
    } catch {
        return null;
    }
}

/** Converts coords already in the model's space to display units. Hue and other `none` components become 0. */
function displayValues(coords: readonly (number | null)[], model: ColorModelId): Triple {
    const scale = COLOR_MODELS[model].space === 'srgb' ? 255 : 1;
    return [0, 1, 2].map((i) => finiteOr(coords[i], 0) * scale) as Triple;
}

function hexByte(n: number): string {
    return Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
}

function hsvToRgb({ h, s, v }: Hsv): Triple {
    const channel = (n: number) => {
        const k = (n + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    return [channel(5), channel(3), channel(1)];
}

function rgbToHsv([r, g, b]: Triple): { h: number; s: number; v: number; } {
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d > 0) {
        if (max === r) {
            h = (g - b) / d;
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }
        h = (h * 60 + 360) % 360;
    }
    return { h, s: max === 0 ? 0 : d / max, v: max };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Color.js reports `none` components as null (NaN); they read as the fallback */
const finiteOr = (n: number | null | undefined, fallback: number): number => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);
