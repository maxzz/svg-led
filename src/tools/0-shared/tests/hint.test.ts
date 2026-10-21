import { describe, expect, it } from "vitest";
import { hintParts, modifierHint } from "../5-hint";

const NONE = { shift: false, alt: false, ctrl: false };
const LEGEND = 'Click to select · [Shift] add · [Alt] copy';
const BY_KEY = {
    shift: '[Shift] Click to add or remove',
    alt: '[Alt] Drag to copy',
};

describe("hintParts", () => {
    it("draws bracketed keys as keys and keeps the rest as text", () => {
        expect(hintParts('Click to add · [Shift] add')).toEqual([
            { text: 'Click to add · ' },
            { key: 'Shift' },
            { text: ' add' },
        ]);
    });

    it("keeps a hint without keys as plain text", () => {
        expect(hintParts('Drag to pan')).toEqual([{ text: 'Drag to pan' }]);
    });

    it("returns keys at the start and the end of the hint", () => {
        expect(hintParts('[Esc]')).toEqual([{ key: 'Esc' }]);
        expect(hintParts('[Enter] or [Esc]')).toEqual([{ key: 'Enter' }, { text: ' or ' }, { key: 'Esc' }]);
    });
});

describe("modifierHint", () => {
    it("shows the legend when no modifier is held", () => {
        expect(modifierHint(NONE, LEGEND, BY_KEY)).toBe(LEGEND);
    });

    it("shows what the held modifier does instead of the legend", () => {
        expect(modifierHint({ ...NONE, shift: true }, LEGEND, BY_KEY)).toBe(BY_KEY.shift);
        expect(modifierHint({ ...NONE, alt: true }, LEGEND, BY_KEY)).toBe(BY_KEY.alt);
    });

    it("joins the texts of several held modifiers in a fixed order", () => {
        expect(modifierHint({ shift: true, alt: true, ctrl: false }, LEGEND, BY_KEY)).toBe(`${BY_KEY.shift} · ${BY_KEY.alt}`);
        expect(modifierHint({ shift: true, alt: true, ctrl: false }, LEGEND, { alt: BY_KEY.alt, shift: BY_KEY.shift })).toBe(`${BY_KEY.shift} · ${BY_KEY.alt}`);
    });

    it("shows the legend when the held modifiers have no text in this tool", () => {
        expect(modifierHint({ ...NONE, ctrl: true }, LEGEND, BY_KEY)).toBe(LEGEND);
    });
});
