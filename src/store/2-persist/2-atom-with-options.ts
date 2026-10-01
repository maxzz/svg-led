import { type WritableAtom, atom } from "jotai";
import { dialogOptionsKey, toolOptionsKey } from "./1-storage-keys";

type OptionsAtom<T> = WritableAtom<T, [update: Partial<T>], void>;

/**
 * Atom with an object value stored under its own localStorage key.
 * The stored value is merged over the defaults, so options added later get their default values.
 * The write takes a partial update and merges it into the current value.
 */
export function atomWithStoredOptions<T extends object>(key: string, defaults: T): OptionsAtom<T> {
    const baseAtom = atom<T>(loadOptions(key, defaults));

    return atom(
        (get) => get(baseAtom),
        (get, set, update: Partial<T>) => {
            const next = { ...get(baseAtom), ...update };
            set(baseAtom, next);
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch (e) {
                console.error(`Failed to save options "${key}"`, e);
            }
        }
    );
}

export function atomWithToolOptions<T extends object>(toolId: string, defaults: T): OptionsAtom<T> {
    return atomWithStoredOptions(toolOptionsKey(toolId), defaults);
}

export function atomWithDialogOptions<T extends object>(dialogId: string, defaults: T): OptionsAtom<T> {
    return atomWithStoredOptions(dialogOptionsKey(dialogId), defaults);
}

function loadOptions<T extends object>(key: string, defaults: T): T {
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                return { ...defaults, ...pickKnownKeys(parsed, defaults) };
            }
        }
    } catch (e) {
        console.error(`Failed to load options "${key}"`, e);
    }
    return { ...defaults };
}

/** Drops keys that are no longer part of the options so removed options do not linger in storage */
function pickKnownKeys<T extends object>(parsed: Record<string, unknown>, defaults: T): Partial<T> {
    const rv: Record<string, unknown> = {};
    for (const key of Object.keys(defaults)) {
        if (key in parsed && typeof parsed[key] === typeof (defaults as Record<string, unknown>)[key]) {
            rv[key] = parsed[key];
        }
    }
    return rv as Partial<T>;
}
