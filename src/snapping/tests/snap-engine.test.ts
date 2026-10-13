import { describe, expect, it } from "vitest";
import { snapBox } from "../1-snap-engine";

const opts = { threshold: 5, spacing: true, axes: ['x', 'y'] as const };
const r = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe("snapBox alignment", () => {
    it("snaps the left edge to another box's left edge", () => {
        const off = snapBox(r(102, 200, 10, 10), [r(100, 0, 30, 30)], opts);
        expect(off.dx).toBeCloseTo(-2);
        expect(off.guides.some((g) => g.x1 === 100 && g.x2 === 100)).toBe(true);
    });

    it("snaps centers together", () => {
        // moving box center = 49, other center = 50 (other spans 35..65)
        const off = snapBox(r(44, 0, 10, 10), [r(35, 100, 30, 30)], opts);
        expect(off.dx).toBeCloseTo(1);
    });

    it("ignores distances beyond the threshold", () => {
        // moving box spans 140..150; other box spans 100..130: nearest distance is 10
        const off = snapBox(r(140, 200, 10, 10), [r(100, 0, 30, 30)], opts);
        expect(off.dx).toBe(0);
        expect(off.dy).toBe(0);
    });

    it("respects the axis list", () => {
        const off = snapBox(r(102, 102, 10, 10), [r(100, 100, 30, 30)], { ...opts, axes: ['y'] });
        expect(off.dx).toBe(0);
        expect(off.dy).toBeCloseTo(-2);
    });
});

describe("snapBox spacing", () => {
    it("makes a gap equal to the gap between two other boxes", () => {
        // a: 0..10, b: 30..40 -> gap 20. Moving box (width 10) should go to 60..70 (gap 20 from b)
        const a = r(0, 0, 10, 10);
        const b = r(30, 0, 10, 10);
        const off = snapBox(r(63, 0, 10, 10), [a, b], { ...opts, axes: ['x'] });
        expect(off.dx).toBeCloseTo(-3);
        expect(off.guides.some((g) => g.gap === 20)).toBe(true);
    });

    it("centers a box between two others when the gaps match", () => {
        // a: 0..10, b: 50..60 -> free space 40; box width 10 centered at 20..30
        const a = r(0, 0, 10, 10);
        const b = r(50, 0, 10, 10);
        // box at 23..33 needs to move to 25..35 (gaps of 15 on each side)
        const off = snapBox(r(23, 0, 10, 10), [a, b], { ...opts, axes: ['x'] });
        expect(off.dx).toBeCloseTo(2);
    });

    it("does not use spacing when disabled", () => {
        const a = r(0, 0, 10, 10);
        const b = r(30, 0, 10, 10);
        const off = snapBox(r(63, 0, 10, 10), [a, b], { ...opts, spacing: false, axes: ['x'] });
        expect(off.dx).toBe(0);
    });
});
