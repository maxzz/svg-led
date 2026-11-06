import { describe, expect, it } from "vitest";
import { ROTATE_CURSOR_DEGREES } from "@/ui/cursors/rotate-glyph";
import { rotateCursorStyle } from "@/ui/cursors/cursor-rotate";
import {
    formatRotation, inRotateBand, rotateCursorClass, snapRotation, unwrapAngle,
} from "../3-rotate";

const box = { x: 10, y: 20, width: 100, height: 40 };

describe("inRotateBand", () => {
    it("ignores the inside of the frame and the grip squares", () => {
        expect(inRotateBand(box, { x: 50, y: 40 })).toBe(false);
        expect(inRotateBand(box, { x: 10, y: 20 })).toBe(false);
        // outer corner of a 4px grip centered on the frame corner
        expect(inRotateBand(box, { x: 8, y: 18 })).toBe(false);
        // 1px outside the frame, still on the grip
        expect(inRotateBand(box, { x: 9, y: 40 })).toBe(false);
    });

    it("starts just outside the grips and stops at the outer reach", () => {
        expect(inRotateBand(box, { x: 7, y: 40 })).toBe(true);
        expect(inRotateBand(box, { x: 10 - 16, y: 40 })).toBe(true);
        expect(inRotateBand(box, { x: 10 - 17, y: 40 })).toBe(false);
        // outside a corner, between the grip and the outer corner of the band
        expect(inRotateBand(box, { x: 0, y: 10 })).toBe(true);
    });
});

describe("snapRotation", () => {
    it("jumps to the nearest 15° step, including across zero", () => {
        expect(snapRotation(0, true)).toBe(0);
        expect(snapRotation(7.4, true)).toBe(0);
        expect(snapRotation(7.5, true)).toBe(15);
        expect(snapRotation(22.4, true)).toBe(15);
        expect(snapRotation(22.5, true)).toBe(30);
        expect(snapRotation(-7.4, true)).toBe(0);
        expect(snapRotation(-7.5, true)).toBe(-15);
        expect(snapRotation(-22.5, true)).toBe(-30);
        expect(snapRotation(22.6, false)).toBe(22.6);
    });
});

describe("unwrapAngle", () => {
    it("keeps turning past 180° instead of flipping sign", () => {
        const start = 0;
        const previous = 170 * Math.PI / 180;
        const current = -170 * Math.PI / 180;
        expect(unwrapAngle(start, current, previous) * 180 / Math.PI).toBeCloseTo(190, 5);
    });

    it("follows a small move", () => {
        expect(unwrapAngle(0, 0.4, 0.2)).toBeCloseTo(0.4, 8);
    });
});

describe("formatRotation", () => {
    it("shows two decimals while free and whole degrees while snapped", () => {
        expect(formatRotation(3.444, false)).toBe("3.44°");
        expect(formatRotation(3.44, false)).toBe("3.44°");
        expect(formatRotation(0, false)).toBe("0.00°");
        expect(formatRotation(-0.001, false)).toBe("0.00°");
        expect(formatRotation(15, true)).toBe("15°");
        expect(formatRotation(-30, true)).toBe("-30°");
        expect(formatRotation(0, true)).toBe("0°");
    });
});

describe("rotateCursorClass", () => {
    const center = { x: 0, y: 0 };

    it("points the bulge from the box center toward the pointer", () => {
        expect(rotateCursorClass(center, { x: 10, y: 0 })).toBe("cursor-rotate-0");
        expect(rotateCursorClass(center, { x: 0, y: 10 })).toBe("cursor-rotate-90");
        expect(rotateCursorClass(center, { x: -10, y: 0 })).toBe("cursor-rotate-180");
        expect(rotateCursorClass(center, { x: 0, y: -10 })).toBe("cursor-rotate-270");
    });

    it("uses the same 15° steps as the cursor bitmaps", () => {
        const at = (deg: number) => rotateCursorClass(center, { x: Math.cos(deg * Math.PI / 180), y: Math.sin(deg * Math.PI / 180) });
        expect(at(7)).toBe("cursor-rotate-0");
        expect(at(8)).toBe("cursor-rotate-15");
        for (const deg of [0, 15, 90, 180, 270, 345]) {
            expect(ROTATE_CURSOR_DEGREES).toContain(Number(at(deg).slice("cursor-rotate-".length)));
        }
    });
});

describe("rotateCursorStyle", () => {
    it("has a bitmap at every 15° step, so the corners are not stuck with the edge cursors", () => {
        for (const deg of ROTATE_CURSOR_DEGREES) {
            expect(rotateCursorStyle(`cursor-rotate-${deg}`), String(deg)).toMatch(/^url\(/);
        }
        expect(rotateCursorStyle("cursor-rotate-45")).not.toBe(rotateCursorStyle("cursor-rotate-0"));
        expect(rotateCursorStyle("cursor-rotate-135")).not.toBe(rotateCursorStyle("cursor-rotate-90"));
    });
});

