export const MIXED = Symbol('mixed');

export type MaybeMixed<T> = T | typeof MIXED;

/** Common value of all items, or MIXED when they differ */
export function commonValue<I, T>(items: readonly I[], read: (item: I) => T): MaybeMixed<T> | undefined {
    if (!items.length) {
        return undefined;
    }
    
    const first = read(items[0]);
    
    for (let i = 1; i < items.length; i++) {
        if (read(items[i]) !== first) {
            return MIXED;
        }
    }
    return first;
}
