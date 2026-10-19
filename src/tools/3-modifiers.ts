export type Modifier = 'shift' | 'alt' | 'ctrl';

/**
 * Which modifier key changes which behavior. Tools read their modifiers from here only,
 * so a binding can be changed in one place; the Help dialog lists this table.
 */
export const MODIFIERS = {
    select: {
        toggleSelection: 'shift',        // Shift+click adds or removes an element
        constrainAxis: 'shift',          // move only horizontally or vertically
        duplicateDrag: 'alt',            // Alt+drag moves a copy
        deepSelect: 'ctrl',              // Ctrl+click selects an element inside a group
        snapToObjects: 'ctrl',           // Ctrl held while dragging snaps to other elements (also on in Preferences)
        resizeKeepAspect: 'shift',
        resizeFromCenter: 'alt',
    },
    points: {
        toggleAnchor: 'shift',           // Shift+click adds or removes an anchor
        constrainAngle: 'shift',         // handles snap to 45 degrees
        snapToObjects: 'ctrl',           // Ctrl held while dragging an anchor snaps to other elements
        breakHandle: 'alt',              // Alt+drag on a handle moves it alone (smooth -> cusp)
        convertAnchor: 'alt',            // Alt+click toggles corner/smooth, Alt+drag pulls out handles
        addDeletePoint: 'ctrl',          // Ctrl+click on a segment adds, on an anchor deletes
    },
    shapes: {
        constrain: 'shift',              // square, circle, 45 degree lines
        fromCenter: 'alt',
    },
    pen: {
        breakHandle: 'alt',              // Alt while dragging moves only the outgoing handle
        constrainAngle: 'shift',
    },
} as const satisfies Record<string, Record<string, Modifier>>;

type ModifierDescriptions = { [G in keyof typeof MODIFIERS]: Record<keyof typeof MODIFIERS[G], string> };

/** Help text for every entry of MODIFIERS; the type makes a missing description a compile error */
export const MODIFIER_DESCRIPTIONS: ModifierDescriptions = {
    select: {
        toggleSelection: 'click to add or remove an element from the selection',
        constrainAxis: 'drag to move only horizontally or vertically',
        duplicateDrag: 'drag to move a copy',
        deepSelect: 'click to select an element inside a group',
        snapToObjects: 'drag to snap to other elements (even when snapping is off in Preferences)',
        resizeKeepAspect: 'resize a corner keeping the aspect ratio (edges change one side only)',
        resizeFromCenter: 'resize from the center (edges stretch from the middle of the box)',
    },
    points: {
        toggleAnchor: 'click to add or remove an anchor from the selection',
        constrainAngle: 'drag a handle to snap its angle to 45°',
        snapToObjects: 'drag an anchor to snap to other elements (even when snapping is off in Preferences)',
        breakHandle: 'drag a handle to move it alone (smooth becomes cusp)',
        convertAnchor: 'click an anchor to toggle corner and smooth, drag to pull out handles',
        addDeletePoint: 'click a segment to add an anchor, click an anchor to delete it',
    },
    shapes: {
        constrain: 'draw a square, a circle or a 45° line',
        fromCenter: 'draw from the center',
    },
    pen: {
        breakHandle: 'while dragging, move only the outgoing handle',
        constrainAngle: 'snap handles to 45°',
    },
};

export function isMod(e: { shift: boolean; alt: boolean; ctrl: boolean; }, m: Modifier): boolean {
    return e[m];
}

export const MODIFIER_LABELS: Record<Modifier, string> = {
    shift: 'Shift',
    alt: 'Alt',
    ctrl: 'Ctrl',
};
