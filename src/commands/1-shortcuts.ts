/** Matches a keyboard event against "Ctrl+Shift+Z"-style text; Ctrl means Ctrl or Cmd */
export function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
    const parts = shortcut.split('+');
    const key = parts.pop()!.toLowerCase();
    const mods = new Set(parts.map((p) => p.toLowerCase()));

    const ctrl = e.ctrlKey || e.metaKey;
    if (mods.has('ctrl') !== ctrl || mods.has('alt') !== e.altKey) {
        return false;
    }
    // Shift must match, for symbols too: "[" with Shift is "{", a different shortcut from "Ctrl+Shift+[".
    // A symbol typed with Shift still matches by its character ("?" is Shift+"/").
    const shiftMatches = mods.has('shift') === e.shiftKey;
    const isSymbol = key.length === 1 && !/[a-z0-9]/.test(key);
    if (!shiftMatches && !(isSymbol && eventKey(e) === key)) {
        return false;
    }
    return eventKey(e) === key || (shiftMatches && codeKey(e) === key);
}

function eventKey(e: KeyboardEvent): string {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
}

/** Layout-independent fallback for letters, digits and brackets */
function codeKey(e: KeyboardEvent): string {
    const c = e.code;
    if (c.startsWith('Key')) return c.slice(3).toLowerCase();
    if (c.startsWith('Digit')) return c.slice(5);
    if (c === 'BracketLeft') return '[';
    if (c === 'BracketRight') return ']';
    if (c === 'Equal') return '=';
    if (c === 'Minus') return '-';
    if (c === 'Slash') return '/';
    return '';
}

export function isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el?.closest) {
        return false;
    }
    return !!el.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, [role="dialog"], [role="menu"]');
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Shortcut text for display: Ctrl becomes Cmd on macOS */
export function displayShortcut(shortcut: string): string {
    return isMac ? shortcut.replace(/Ctrl/g, '⌘').replace(/Alt/g, '⌥').replace(/Shift/g, '⇧').replace(/\+/g, '') : shortcut;
}
