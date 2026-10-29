import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import { COMMANDS, COMMAND_GROUP_LABELS, type CommandGroup, matchShortcut } from "@/commands";
import { MODIFIERS, MODIFIER_DESCRIPTIONS, MODIFIER_LABELS, type Modifier, TOOLS, toolShortcuts } from "@/tools";

export type ShortcutRowData = { id: string; label: string; shortcuts: string[]; };
export type ShortcutSectionData = { id: string; heading: string; rows: ShortcutRowData[]; };

//---------------------------------------------------------------------------

export const TOOL_ROWS: ShortcutRowData[] = TOOLS.map(
    (tool) => ({ id: tool.id, label: tool.label, shortcuts: toolShortcuts(tool) })
);

function commandSections(groups: CommandGroup[]): ShortcutSectionData[] {
    return groups.map(
        (group) => ({
            id: group,
            heading: COMMAND_GROUP_LABELS[group],
            rows: COMMANDS
                .filter((c) => c.group === group && c.shortcut)
                .map((c) => ({ id: c.id, label: c.label, shortcuts: [c.shortcut!, ...(c.alsoKeys ?? [])] })),
        })
    ).filter((section) => section.rows.length);
}

export const EDITOR_SECTIONS = commandSections(['file', 'edit', 'object']);
export const VIEW_SECTIONS = commandSections(['view', 'viewbox', 'help']);

/** Keys and mouse actions that are not commands (they are handled by tools, controllers or dialogs), so the command list does not show them */
export const CANVAS_ROWS: ShortcutRowData[] = [
    { label: 'Copy the selection as SVG', shortcuts: ['Ctrl+C'] },
    { label: 'Cut the selection as SVG', shortcuts: ['Ctrl+X'] },
    { label: 'Paste SVG markup from the clipboard', shortcuts: ['Ctrl+V'] },
    { label: 'Pan: hold Space and drag, or drag with the middle mouse button', shortcuts: ['Space'] },
    { label: 'Zoom around the pointer (Ctrl+wheel zooms faster)', shortcuts: ['Wheel'] },
    { label: 'Scroll sideways', shortcuts: ['Shift+Wheel'] },
    { label: 'Nudge the selection by 1 (in Points: move the selected anchors)', shortcuts: ['Arrows'] },
    { label: 'Nudge the selection by 10', shortcuts: ['Shift+Arrows'] },
    { label: 'Back to Select, then leave isolation, then clear the selection', shortcuts: ['Esc'] },
    { label: 'Delete the selection (in Points: the selected anchors)', shortcuts: ['Delete', 'Backspace'] },
    { label: 'Pen: remove the last point while drawing', shortcuts: ['Backspace', 'Delete'] },
    { label: 'Pen: finish the path', shortcuts: ['Enter', 'Esc'] },
    { label: 'Double-click a group to isolate it; double-click empty canvas to leave one level', shortcuts: ['Double-click'] },
    { label: 'Scraps list: move between scraps', shortcuts: ['Arrows', 'Home', 'End'] },
    { label: 'Scraps list: load the selected scrap', shortcuts: ['Enter'] },
].map((row) => ({ ...row, id: row.label }));

const MODIFIER_GROUP_LABELS: Record<keyof typeof MODIFIERS, string> = {
    select: 'Selection tool',
    points: 'Edit points tool',
    shapes: 'Shape tools',
    pen: 'Pen tool',
};

export const MODIFIER_SECTIONS: ShortcutSectionData[] = (Object.keys(MODIFIERS) as (keyof typeof MODIFIERS)[]).map(
    (group) => ({
        id: group,
        heading: MODIFIER_GROUP_LABELS[group],
        rows: Object.entries(MODIFIERS[group]).map(
            ([key, mod]) => ({
                id: key,
                label: (MODIFIER_DESCRIPTIONS[group] as Record<string, string>)[key],
                shortcuts: [MODIFIER_LABELS[mod as Modifier]],
            })
        ),
    })
);

//---------------------------------------------------------------------------

export type Matcher = {
    row: (row: ShortcutRowData) => boolean;
    heading: (heading: string) => boolean;
};

const matchAll: Matcher = { row: () => true, heading: () => false };

function words(text: string): string[] {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** 'Ctrl+Shift+Z' -> ['ctrl', 'shift', 'z']; Mac symbols are spelled out */
function keyTokens(text: string): string[] {
    return text.toLowerCase()
        .replace(/⌘/g, '+ctrl+').replace(/⌥/g, '+alt+').replace(/⇧/g, '+shift+')
        .split('+').map((t) => t.trim()).filter(Boolean);
}

/**
 * Every typed word must start a word of the label ('h' finds 'Hand' and 'Hide selection'),
 * or every typed key must be a whole key of the shortcut ('h' finds Ctrl+Shift+H, but never matches inside 'Shift').
 * Text with '+' or without letters and digits ('Ctrl+Z', 'shift+1', '?') is read as keys only.
 */
export function nameMatcher(query: string): Matcher {
    const text = query.trim();
    if (!text) {
        return matchAll;
    }

    const isKeysOnly = text.includes('+') || !words(text).length;
    const keys = isKeysOnly ? keyTokens(text) : words(text);
    const matchesKeys = (row: ShortcutRowData) => row.shortcuts.some((s) => { const tokens = keyTokens(s); return keys.every((k) => tokens.includes(k)); });

    if (isKeysOnly) {
        return { row: matchesKeys, heading: () => false };
    }

    const queryWords = words(text);
    const matchesText = (label: string) => {
        const labelWords = words(label);
        return queryWords.every((q) => labelWords.some((w) => w.startsWith(q)));
    };
    return { row: (row) => matchesText(row.label) || matchesKeys(row), heading: matchesText };
}

/** A key combination pressed in record mode; 'event' is absent while only modifiers are held */
export type RecordedKeys = {
    text: string;
    mods: string[];
    event?: KeyboardEvent;
};

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

export function recordKeys(e: ReactKeyboardEvent): RecordedKeys {
    const mods = [(e.ctrlKey || e.metaKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift'].filter((m): m is string => !!m);
    if (MODIFIER_KEYS.has(e.key)) {
        return { text: mods.join('+'), mods };
    }
    const key = recordedKeyName(e);
    return {
        text: [...mods, key].join('+'),
        mods,
        event: e.nativeEvent,
    };
}

/** Layout-independent name of the main key, spelled like the shortcut list: Shift+1 stays '1', not '!' */
function recordedKeyName(e: ReactKeyboardEvent): string {
    const c = e.code;
    if (c.startsWith('Key')) return c.slice(3);
    if (c.startsWith('Digit')) return c.slice(5);
    if (e.key.startsWith('Arrow')) return 'Arrows';
    const byCode: Record<string, string> = { BracketLeft: '[', BracketRight: ']', Equal: '=', Minus: '-', Slash: '/', Comma: ',', Period: '.', Space: 'Space', Escape: 'Esc' };
    return byCode[c] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
}

/** Modifiers alone find every shortcut that uses them; a full combination finds the shortcuts it would trigger */
export function keysMatcher(recorded: RecordedKeys | null): Matcher {
    if (!recorded) {
        return matchAll;
    }
    const mods = recorded.mods.map((m) => m.toLowerCase());
    const recordedTokens = keyTokens(recorded.text);
    const { event } = recorded;

    return {
        row: (row) => row.shortcuts.some((s) => {
            const tokens = keyTokens(s);
            if (!event) {
                return mods.every((m) => tokens.includes(m));
            }
            const isSameKeys = tokens.length === recordedTokens.length && recordedTokens.every((t) => tokens.includes(t));
            return isSameKeys || matchShortcut(event, s);
        }),
        heading: () => false,
    };
}

export function filterRows(rows: ShortcutRowData[], matcher: Matcher): ShortcutRowData[] {
    return rows.filter(matcher.row);
}

/** A section whose heading matches keeps all its rows; otherwise only the matching rows, and empty sections are dropped */
export function filterSections(sections: ShortcutSectionData[], matcher: Matcher): ShortcutSectionData[] {
    return sections
        .map((section) => (matcher.heading(section.heading) ? section : { ...section, rows: filterRows(section.rows, matcher) }))
        .filter((section) => section.rows.length);
}
