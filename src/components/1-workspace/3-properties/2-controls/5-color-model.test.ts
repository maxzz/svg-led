import { describe, expect, it } from "vitest";
import { formatColor, formatHsv, hsvOf, modelOf, modelValues, valuesOf } from "./5-color-model";

describe("formatColor", () => {
    it("writes hex, with alpha only when translucent", () => {
        expect(formatColor('hex', [255, 128, 0], 1)).toBe('#ff8000');
        expect(formatColor('hex', [255, 128, 0], 0.5)).toBe('#ff800080');
    });

    it("writes CSS functions with the space-separated / alpha syntax", () => {
        expect(formatColor('hsl', [120, 50, 50], 1)).toBe('hsl(120 50% 50%)');
        expect(formatColor('hsl', [120, 50, 50], 0.5)).toBe('hsl(120 50% 50% / 0.5)');
        expect(formatColor('rgb', [10, 20, 30], 0.25)).toBe('rgb(10 20 30 / 0.25)');
        expect(formatColor('oklch', [0.7, 0.1, 200], 1)).toBe('oklch(0.7 0.1 200)');
    });
});

describe("modelOf", () => {
    it("keeps the notation a value was written in", () => {
        expect(modelOf('#1e1e1e')).toBe('hex');
        expect(modelOf('hsl(120 50% 50%)')).toBe('hsl');
        expect(modelOf('HSLA(120, 50%, 50%, .5)')).toBe('hsl');
        expect(modelOf('oklab(0.7 0 0)')).toBe('oklab');
        expect(modelOf('oklch(0.7 0.1 200)')).toBe('oklch');
    });

    it("falls back to hex for named colors and text that is not a color", () => {
        expect(modelOf('red')).toBe('hex');
        expect(modelOf('none')).toBe('hex');
        expect(modelOf('')).toBe('hex');
    });
});

describe("valuesOf", () => {
    it("reads any CSS color in the requested notation", () => {
        expect(valuesOf('#ff8000', 'rgb')).toEqual([255, 128, 0]);
        expect(valuesOf('hsl(120 50% 50% / .5)', 'hsl')?.map((n) => Math.round(n))).toEqual([120, 50, 50]);
        expect(valuesOf('oklch(0.7 0.1 200)', 'oklch')?.map((n) => +n.toFixed(3))).toEqual([0.7, 0.1, 200]);
    });

    it("returns null for text that is not a color", () => {
        expect(valuesOf('none', 'hsl')).toBeNull();
        expect(valuesOf('', 'hex')).toBeNull();
    });

    it("replaces `none` components (NaN) with 0 so the output never contains NaN", () => {
        const values = valuesOf('oklch(0.7 0 none)', 'oklch');
        expect(values).not.toBeNull();
        expect(values!.every(Number.isFinite)).toBe(true);
        expect(formatColor('oklch', valuesOf('#808080', 'oklch')!, 1)).not.toContain('NaN');
    });
});

describe("hsvOf and formatHsv", () => {
    it("round-trips a hex color through HSV", () => {
        expect(formatHsv(hsvOf('#3366cc', 0), 'hex')).toBe('#3366cc');
    });

    it("keeps the hue when the color is achromatic", () => {
        expect(hsvOf('#808080', 200).h).toBe(200);
        expect(hsvOf('none', 75)).toEqual({ h: 75, s: 0, v: 0, a: 1 });
    });

    it("reads hue, saturation, value and alpha", () => {
        const hsv = hsvOf('hsl(240 100% 50% / 0.25)', 0);
        expect(hsv.h).toBeCloseTo(240, 6);
        expect(hsv.s).toBeCloseTo(1, 6);
        expect(hsv.v).toBeCloseTo(1, 6);
        expect(hsv.a).toBeCloseTo(0.25, 6);
    });

    it("writes the requested notation for the same color", () => {
        const red = hsvOf('#ff0000', 0);
        expect(formatHsv(red, 'hsl')).toBe('hsl(0 100% 50%)');
        expect(formatHsv({ ...red, a: 0.5 }, 'rgb')).toBe('rgb(255 0 0 / 0.5)');
    });

    it("keeps the alpha when writing a model", () => {
        expect(modelValues({ h: 0, s: 1, v: 1, a: 0.5 }, 'hsl')).toEqual([0, 100, 50]);
        expect(formatHsv({ h: 0, s: 1, v: 1, a: 0.5 }, 'hex')).toBe('#ff000080');
    });
});
