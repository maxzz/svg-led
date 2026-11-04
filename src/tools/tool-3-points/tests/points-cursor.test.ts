import { describe, expect, it } from "vitest";
import { type HeldKeys } from "@/store/4-editor/4-interaction-atoms";
import { type PointsHover, pointsCursorClass } from "../2-points-cursor-class";

const keys = (over: Partial<HeldKeys> = {}): HeldKeys => ({ shift: false, alt: false, ctrl: false, ...over });
const hover = (over: Partial<PointsHover> = {}): PointsHover => ({ kind: 'none', selected: false, canAdd: false, ...over });

describe("pointsCursorClass", () => {
    it("uses the plain arrow on empty canvas and a square over an unselected object", () => {
        expect(pointsCursorClass(hover(), keys(), false)).toBe('cursor-direct-ptr');
        expect(pointsCursorClass(hover({ kind: 'node' }), keys(), false)).toBe('cursor-direct-hover');
    });

    it("uses the move arrow over a selected object, a point, or a handle, and while dragging", () => {
        expect(pointsCursorClass(hover({ kind: 'node', selected: true }), keys(), false)).toBe('cursor-direct-move');
        expect(pointsCursorClass(hover({ kind: 'anchor' }), keys(), false)).toBe('cursor-direct-move');
        expect(pointsCursorClass(hover({ kind: 'handle' }), keys(), false)).toBe('cursor-direct-move');
        expect(pointsCursorClass(hover({ kind: 'shape-handle' }), keys(), false)).toBe('cursor-direct-move');
        expect(pointsCursorClass(hover(), keys(), true)).toBe('cursor-direct-move');
    });

    it("shows add, delete, and convert while the matching modifier is held", () => {
        expect(pointsCursorClass(hover({ canAdd: true }), keys({ ctrl: true }), false)).toBe('cursor-direct-add');
        expect(pointsCursorClass(hover({ kind: 'anchor' }), keys({ ctrl: true }), false)).toBe('cursor-direct-delete');
        expect(pointsCursorClass(hover({ kind: 'anchor' }), keys({ alt: true }), false)).toBe('cursor-direct-convert');
        // Ctrl is checked first, matching the click: it deletes the point instead of converting it
        expect(pointsCursorClass(hover({ kind: 'anchor', canAdd: true }), keys({ alt: true, ctrl: true }), false)).toBe('cursor-direct-delete');
    });
});
