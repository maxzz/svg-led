import { describe, expect, it } from "vitest";
import { ROTATE_CURSOR_IMAGE_DEGREES } from "@/ui/cursors/8-rotate-glyph";
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

    it("rotates along the diagonal out of a corner, not straight out of it", () => {
        // top-right corner is (110, 20); along the diagonal toward the corner's outside
        expect(inRotateBand(box, { x: 110 + 7.07, y: 20 - 7.07 })).toBe(true);
        // straight up from the same corner is not on the line
        expect(inRotateBand(box, { x: 110, y: 20 - 10 })).toBe(false);
    });

    it("only reaches near the grips, not along the rest of an edge", () => {
        // above the top edge, midway between the top-left and top-middle grips
        expect(inRotateBand(box, { x: 30, y: 14 })).toBe(false);
        // above the top-middle grip
        expect(inRotateBand(box, { x: 60, y: 14 })).toBe(true);
        // left of a tall frame: far from the top-left and left-middle grips
        const tall = { x: 10, y: 20, width: 100, height: 200 };
        expect(inRotateBand(tall, { x: 7, y: 60 })).toBe(false);
        expect(inRotateBand(tall, { x: 7, y: 120 })).toBe(true);
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

    it("snaps to 15° first, then uses the nearest of the eight 45° images", () => {
        const at = (deg: number) => rotateCursorClass(center, { x: Math.cos(deg * Math.PI / 180), y: Math.sin(deg * Math.PI / 180) });
        expect(at(7)).toBe("cursor-rotate-0");
        expect(at(8)).toBe("cursor-rotate-0");   // snaps to 15, nearest image is 0
        expect(at(23)).toBe("cursor-rotate-45"); // snaps to 30, nearest image is 45
        expect(at(80)).toBe("cursor-rotate-90"); // snaps to 75 -> 90
        expect(at(100)).toBe("cursor-rotate-90");
        for (const deg of [0, 15, 90, 180, 270, 345]) {
            expect(ROTATE_CURSOR_IMAGE_DEGREES).toContain(Number(at(deg).slice("cursor-rotate-".length)));
        }
    });
});

