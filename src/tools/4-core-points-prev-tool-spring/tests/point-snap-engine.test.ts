import { describe, expect, it } from "vitest";
import { type PointTarget, TIER_OBJECT, TIER_POINT, boxTargets, snapPoint } from "../../2-2-core-snapping-points/1-point-snap-engine";

const opts = { threshold: 5, axes: ['x', 'y'] as const };
const pt = (x: number, y: number): PointTarget => ({ x, y, tier: TIER_POINT });
const obj = (x: number, y: number): PointTarget => ({ x, y, tier: TIER_OBJECT });

describe("snapPoint", () => {
    it("lands on a point within reach and marks it", () => {
        const r = snapPoint({ x: 102, y: 98 }, [pt(100, 100)], opts);
        expect(r.point).toEqual({ x: 100, y: 100 });
        expect(r.guides).toHaveLength(0);
        expect(r.marks).toEqual([{ x: 100, y: 100 }]);
    });

    it("lines up vertically with a distant point and draws a guide to it", () => {
        const r = snapPoint({ x: 103, y: 300 }, [pt(100, 0)], opts);
        expect(r.point).toEqual({ x: 100, y: 300 });
        expect(r.guides).toEqual([{ x1: 100, y1: 0, x2: 100, y2: 300 }]);
        expect(r.marks).toEqual([{ x: 100, y: 0 }]);
    });

    it("lines up on both axes and marks the crossing", () => {
        const r = snapPoint({ x: 102, y: 203 }, [pt(100, 0), pt(0, 200)], opts);
        expect(r.point).toEqual({ x: 100, y: 200 });
        expect(r.guides).toHaveLength(2);
        expect(r.marks).toContainEqual({ x: 100, y: 200 });
    });

    it("prefers points over objects even when the object is nearer", () => {
        const r = snapPoint({ x: 101, y: 300 }, [obj(100.5, 0), pt(104, 50)], opts);
        expect(r.point.x).toBe(104);
    });

    it("falls back to objects when no point is in reach", () => {
        const r = snapPoint({ x: 52, y: 300 }, boxTargets({ x: 0, y: 0, width: 100, height: 100 }), opts);
        expect(r.point.x).toBe(50); // center line
    });

    it("prefers landing on an object corner over lining up with a point", () => {
        const r = snapPoint({ x: 1, y: 1 }, [obj(0, 0), pt(2, 500)], opts);
        expect(r.point).toEqual({ x: 0, y: 0 });
    });

    it("only moves along the free axis of a constrained drag", () => {
        const r = snapPoint({ x: 102, y: 98 }, [pt(100, 100)], { threshold: 5, axes: ['x'] });
        expect(r.point).toEqual({ x: 100, y: 98 });
    });

    it("does nothing beyond the threshold", () => {
        const r = snapPoint({ x: 110, y: 110 }, [pt(100, 100)], opts);
        expect(r.snapped).toBe(false);
        expect(r.point).toEqual({ x: 110, y: 110 });
    });

    it("draws the guide to the nearest of several aligned targets", () => {
        const r = snapPoint({ x: 101, y: 300 }, [pt(100, 0), pt(100, 250)], opts);
        expect(r.guides[0]).toEqual({ x1: 100, y1: 250, x2: 100, y2: 300 });
    });
});
