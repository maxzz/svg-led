import { describe, expect, it } from "vitest";
import { type Point, offsetPathData, parsePathData, pathDataToSubpaths, type OffsetPathOptions } from "../index";

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

function anchorCount(d: string): number {
    return pathDataToSubpaths(d).reduce((sum, sub) => sum + sub.anchors.length, 0);
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

    it("moves each corner of a closed square and keeps the corner count", () => {
        const grown = offsetPathData(SQUARE, options({ offset: 1 }), 3);
        expect(anchorCount(grown)).toBe(anchorCount(SQUARE));
        expect(grown).toBe('M-1 -1 L11 -1 L11 11 L-1 11 Z');

        const shrunk = offsetPathData(SQUARE, options({ offset: -1 }), 3);
        expect(anchorCount(shrunk)).toBe(4);
        expect(shrunk).toBe('M1 1 L9 1 L9 9 L1 9 Z');
    });

    it("grows a straight line on one side only, and longer along the line", () => {
        const grown = offsetPathData('M0 0 L10 0', options({ offset: 2 }), 3);
        expect(grown).toBe('M-2 0 L12 0 L12 -2 L-2 -2 Z');
        const box = boxOf(grown);
        expect(box.width).toBe(14);
        expect(box.height).toBe(2);
        expect(box.y).toBe(-2);

        const shrunk = offsetPathData('M0 0 L10 0', options({ offset: -2 }), 3);
        expect(shrunk).toBe('M2 0 L8 0 L8 2 L2 2 Z');
    });

    it("keeps a polyline's point count and only moves those points", () => {
        const src = 'M0 0 L10 0 L10 10';
        const mitred = offsetPathData(src, options({ offset: 1, miterLimit: 4 }), 3);
        expect(anchorCount(mitred)).toBe(anchorCount(src));
        expect(mitred).toBe('M0 -1 L11 -1 L11 10');

        const limited = offsetPathData(src, options({ offset: 1, miterLimit: 1 }), 3);
        expect(anchorCount(limited)).toBe(3);
        expect(limited).toBe('M0 -1 L10.707 -0.707 L11 10');
    });

    it("puts a round corner on the offset circle without adding points", () => {
        const src = 'M0 0 L10 0 L10 10';
        const out = offsetPathData(src, options({ offset: 1, joins: 'round' }), 3);
        expect(anchorCount(out)).toBe(3);
        const corner = pointsOf(out)[1];
        expect(Math.abs(Math.hypot(corner.x - 10, corner.y) - 1)).toBeLessThan(0.01);
        expect(Math.hypot(corner.x - 11, corner.y + 1)).toBeGreaterThan(0.2);
    });

    it("keeps a sharp miter inside the miter limit and lets a high limit run out", () => {
        const sharp = 'M0 0 L10 0 L0 1';
        const reach = (d: string) => {
            const mid = pathDataToSubpaths(d)[0].anchors[1];
            return Math.hypot(mid.x - 10, mid.y);
        };
        expect(anchorCount(offsetPathData(sharp, options({ offset: 1, miterLimit: 2 }), 3))).toBe(3);
        expect(reach(offsetPathData(sharp, options({ offset: 1, miterLimit: 2 }), 3))).toBeLessThan(2.5);
        expect(reach(offsetPathData(sharp, options({ offset: 1, miterLimit: 100 }), 3))).toBeGreaterThan(5);
    });

    it("scales a curve with the offset and does not add points", () => {
        const src = 'M0 0 C0 10 10 10 10 0';
        const inward = offsetPathData(src, options({ offset: 1 }), 3);
        const outward = offsetPathData(src, options({ offset: -1 }), 3);
        expect(anchorCount(inward)).toBe(anchorCount(src));
        expect(anchorCount(outward)).toBe(anchorCount(src));
        // Positive offset here runs toward the bend, so the handles shorten. The other way lengthens them.
        expect(inward).toBe('M1 0 C1 9.333 9 9.333 9 0');
        expect(outward).toBe('M-1 0 C-1 10.667 11 10.667 11 0');
    });

    it("keeps every corner when a large inward offset crosses the middle", () => {
        const out = offsetPathData(SQUARE, options({ offset: -20 }), 3);
        expect(anchorCount(out)).toBe(4);
        expect(out).not.toBe('');
    });
});
