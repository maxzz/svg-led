import { describe, expect, it } from "vitest";
import { type Point, offsetPathData, parsePathData, type OffsetPathOptions } from "../index";

function options(over: Partial<OffsetPathOptions> = {}): OffsetPathOptions {
    return { offset: 1, joins: 'miter', miterLimit: 4, ...over };
}

function pointsOf(d: string): Point[] {
    const pts: Point[] = [];
    for (const seg of parsePathData(d)) {
        if (seg.c === 'M' || seg.c === 'L' || seg.c === 'C' || seg.c === 'Q' || seg.c === 'A') {
            pts.push(seg.p);
        }
    }
    return pts;
}

function boxOf(d: string) {
    const pts = pointsOf(d);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

const SQUARE = 'M0 0 L10 0 L10 10 L0 10 Z';

describe("offset path", () => {
    it("returns the original path when the distance is zero", () => {
        expect(offsetPathData(SQUARE, options({ offset: 0 }), 3)).toBe(SQUARE);
        expect(offsetPathData('M0 0 L10 0', options({ offset: 0 }), 3)).toBe('M0 0 L10 0');
    });

    it("expands a closed square and shrinks it the other way", () => {
        const grown = boxOf(offsetPathData(SQUARE, options({ offset: 1 }), 3));
        expect(grown.x).toBeCloseTo(-1, 1);
        expect(grown.y).toBeCloseTo(-1, 1);
        expect(grown.width).toBeCloseTo(12, 1);
        expect(grown.height).toBeCloseTo(12, 1);

        const shrunk = boxOf(offsetPathData(SQUARE, options({ offset: -1 }), 3));
        expect(shrunk.x).toBeCloseTo(1, 1);
        expect(shrunk.y).toBeCloseTo(1, 1);
        expect(shrunk.width).toBeCloseTo(8, 1);
        expect(shrunk.height).toBeCloseTo(8, 1);
    });

    it("offsets an open path to the left, and the other way when the distance is negative", () => {
        expect(offsetPathData('M0 0 L10 0', options({ offset: 2 }), 3)).toBe('M0 -2 L10 -2');
        expect(offsetPathData('M0 0 L10 0', options({ offset: -2 }), 3)).toBe('M0 2 L10 2');
    });

    it("miters a right angle and cuts it flat when the miter limit is too small", () => {
        expect(offsetPathData('M0 0 L10 0 L10 10', options({ offset: 1, miterLimit: 4 }), 3)).toBe('M0 -1 L11 -1 L11 10');
        expect(offsetPathData('M0 0 L10 0 L10 10', options({ offset: 1, miterLimit: 1 }), 3)).toBe('M0 -1 L10 -1 L11 0 L11 10');
    });

    it("rounds a right angle onto the offset circle", () => {
        const pts = pointsOf(offsetPathData('M0 0 L10 0 L10 10', options({ offset: 1, joins: 'round' }), 3));
        expect(pts.some((p) => Math.hypot(p.x - 11, p.y + 1) < 0.05)).toBe(false);
        expect(pts.some((p) => Math.abs(Math.hypot(p.x - 10, p.y) - 1) < 0.05 && p.x > 10.2 && p.y < -0.2)).toBe(true);
    });

    it("keeps a sharp miter inside the miter limit and lets a high limit run out", () => {
        const sharp = 'M0 0 L10 0 L0 1';
        // Join points sit between the offset ends. A low limit cuts the spike; a high limit lets it run out.
        const reach = (d: string) => {
            const mid = pointsOf(d).slice(1, -1);
            return Math.max(...mid.map((p) => Math.hypot(p.x - 10, p.y)));
        };
        expect(reach(offsetPathData(sharp, options({ offset: 1, miterLimit: 2 }), 3))).toBeLessThan(2.5);
        expect(reach(offsetPathData(sharp, options({ offset: 1, miterLimit: 100 }), 3))).toBeGreaterThan(5);
    });

    it("returns nothing when a closed path is offset away completely", () => {
        expect(offsetPathData(SQUARE, options({ offset: -20 }), 3)).toBe('');
    });
});
