import type { HeldKeys } from "@/store/4-editor";

/** A piece of a hint line: plain text, or a key drawn as a keycap */
export type HintPart = { text: string; } | { key: string; };

/** Splits "Click to add · [Shift] add" into text and keys. Keys are written in brackets. */
export function hintParts(hint: string): HintPart[] {
    // split with a capture group: odd indexes are the bracketed keys
    return hint.split(/\[([^\]]+)\]/).flatMap((part, i): HintPart[] => (i % 2 ? [{ key: part }] : part ? [{ text: part }] : []));
}

const MODIFIER_ORDER = ['shift', 'alt', 'ctrl'] as const;

/**
 * Hint for the modifier keys held right now: the text of each held key, joined.
 * With no modifier held, the legend is shown. It lists every combination of the tool,
 * so that they are visible before any click.
 */
export function modifierHint(held: HeldKeys, legend: string, byKey: Partial<Record<keyof HeldKeys, string>>): string {
    const shown = MODIFIER_ORDER.flatMap((key) => (held[key] && byKey[key] ? [byKey[key]] : []));
    return shown.length ? shown.join(' · ') : legend;
}
