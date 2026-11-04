import { type HeldKeys } from "@/store/4-editor/4-interaction-atoms";
import { MODIFIERS, isMod } from "../tool-2-select/8-definition-of-modifiers";

const M = MODIFIERS.points;

/** What is under the pointer in Direct selection. `canAdd` means Ctrl+click would insert an anchor. */
export type PointsHover = {
    kind: 'none' | 'node' | 'anchor' | 'handle' | 'shape-handle';
    selected: boolean;
    canAdd: boolean;
};

/** Tailwind cursor class for Direct selection (cursors plugin). */
export function pointsCursorClass(hover: PointsHover, held: HeldKeys, dragging: boolean): string {
    if (dragging) {
        return 'cursor-direct-move';
    }
    if (isMod(held, M.addDeletePoint)) {
        if (hover.kind === 'anchor') {
            return 'cursor-direct-delete';
        }
        if (hover.canAdd) {
            return 'cursor-direct-add';
        }
    }
    if (isMod(held, M.convertAnchor) && hover.kind === 'anchor') {
        return 'cursor-direct-convert';
    }
    if (hover.kind === 'anchor' || hover.kind === 'handle' || hover.kind === 'shape-handle') {
        return 'cursor-direct-move';
    }
    if (hover.kind === 'node') {
        return hover.selected ? 'cursor-direct-move' : 'cursor-direct-hover';
    }
    return 'cursor-direct-ptr';
}
