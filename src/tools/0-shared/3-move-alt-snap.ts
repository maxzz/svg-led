/**
 * Alt turns snapping off for a drag. The Alt that started a duplicate stays the copy key
 * until it is released, and only a later press turns snapping off.
 */
export function altDisablesSnap(duplicateAlt: boolean, altHeld: boolean): { duplicateAlt: boolean; disable: boolean; } {
    if (duplicateAlt) {
        return { duplicateAlt: altHeld, disable: false };
    }
    return { duplicateAlt: false, disable: altHeld };
}
