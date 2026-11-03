import { describe, expect, it } from "vitest";
import { type Point, type RectNode, cubicPoint, flattenPathData, offsetPathData, pathDataToSubpaths, shapeToPath, type OffsetPathOptions } from "../index";

function options(over: Partial<OffsetPathOptions> = {}): OffsetPathOptions {
    return { offset: 1, joins: 'miter', miterLimit: 4, ...over };
}

function anchorCount(d: string): number {
    return pathDataToSubpaths(d).reduce((sum, sub) => sum + sub.anchors.length, 0);
}

/** Points along every segment of the path, curves included */
function samples(d: string, perSegment = 16): Point[] {
    const pts: Point[] = [];
    for (const sub of pathDataToSubpaths(d)) {
        const n = sub.anchors.length;
        const count = sub.closed ? n : n - 1;
        for (let i = 0; i < count; i++) {
            const a = sub.anchors[i];
            const b = sub.anchors[(i + 1) % n];
            for (let k = 0; k < perSegment; k++) {
                pts.push(cubicPoint([a, a.out ?? a, b.in ?? b, b], k / perSegment));
            }
        }
    }
    return pts;
}

function distToPolyline(p: Point, poly: { pts: Point[]; closed: boolean; }[]): number {
    let best = Infinity;
    for (const { pts, closed } of poly) {
        const count = closed ? pts.length : pts.length - 1;
        for (let i = 0; i < count; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len2 = dx * dx + dy * dy;
            const t = len2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
            best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
        }
    }
    return best;
}

/** Largest gap between |offset| and the distance of the result from the source */
function worstDistanceError(src: string, out: string, offset: number): number {
    const poly = flattenPathData(src, 1e-3);
    return Math.max(...samples(out).map((p) => Math.abs(distToPolyline(p, poly) - Math.abs(offset))));
}

function boxOf(d: string) {
    const pts = samples(d, 8);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const r = (v: number) => Math.round(v * 1000) / 1000;
    return { x: r(Math.min(...xs)), y: r(Math.min(...ys)), width: r(Math.max(...xs) - Math.min(...xs)), height: r(Math.max(...ys) - Math.min(...ys)) };
}

const SQUARE = 'M0 0 L10 0 L10 10 L0 10 Z';
const CIRCLE = 'M50 0 A50 50 0 1 1 50 100 A50 50 0 1 1 50 0 Z';
const rounded = (): string => {
    const rect: RectNode = { id: 'r', kind: 'rect', x: 0, y: 0, width: 40, height: 60, rx: 10, ry: 10, attrs: {} };
    return shapeToPath(rect, 3).d;
};

describe("offset path", () => {
    it("returns the original path when the distance is zero", () => {
        expect(offsetPathData(SQUARE, options({ offset: 0 }), 3)).toBe(SQUARE);
    });

    it("grows and shrinks a square with mitered corners and four anchors", () => {
        const grown = offsetPathData(SQUARE, options({ offset: 1 }), 3);
        expect(anchorCount(grown)).toBe(4);
        expect(grown.includes('C')).toBe(false);
        expect(boxOf(grown)).toEqual({ x: -1, y: -1, width: 12, height: 12 });

        const shrunk = offsetPathData(SQUARE, options({ offset: -1 }), 3);
        expect(anchorCount(shrunk)).toBe(4);
        expect(boxOf(shrunk)).toEqual({ x: 1, y: 1, width: 8, height: 8 });
    });

    it("rounds the outside corners of a square with round joins", () => {
        const out = offsetPathData(SQUARE, options({ offset: 2, joins: 'round' }), 3);
        expect(anchorCount(out)).toBe(8);
        expect(worstDistanceError(SQUARE, out, 2)).toBeLessThan(0.01);
        // Each arc leaves its side along the side's own direction.
        for (const a of pathDataToSubpaths(out)[0].anchors) {
            const handle = a.in ?? a.out!;
            expect(handle.x === a.x || handle.y === a.y).toBe(true);
        }
    });

    it("bevels the outside corners of a square with bevel joins", () => {
        const out = offsetPathData(SQUARE, options({ offset: 2, joins: 'bevel' }), 3);
        expect(anchorCount(out)).toBe(8);
        expect(out.includes('C')).toBe(false);
    });

    it("keeps a circle a circle with a few smooth anchors, both ways", () => {
        for (const offset of [10, -10, 40, -45]) {
            const out = offsetPathData(CIRCLE, options({ offset }), 3);
            const r = 50 + offset;
            const worst = Math.max(...samples(out).map((p) => Math.abs(Math.hypot(p.x - 50, p.y - 50) - r)));
            expect(worst).toBeLessThan(0.1);
            expect(anchorCount(out)).toBeLessThanOrEqual(8);
            for (const sub of pathDataToSubpaths(out)) {
                expect(sub.anchors.every((a) => a.kind === 'smooth')).toBe(true);
            }
        }
    });

    it("insets a rounded rectangle with smaller round corners and straight sides", () => {
        const src = rounded();
        const out = offsetPathData(src, options({ offset: -4 }), 3);
        expect(boxOf(out)).toEqual({ x: 4, y: 4, width: 32, height: 52 });
        expect(worstDistanceError(src, out, 4)).toBeLessThan(0.02);
        expect(anchorCount(out)).toBe(8);
    });

    it("grows a rounded rectangle with larger round corners", () => {
        const src = rounded();
        const out = offsetPathData(src, options({ offset: 6 }), 3);
        expect(boxOf(out)).toEqual({ x: -6, y: -6, width: 52, height: 72 });
        expect(worstDistanceError(src, out, 6)).toBeLessThan(0.02);
        expect(anchorCount(out)).toBe(8);
    });

    it("sharpens the corners of a rounded rectangle once the inset is past the radius", () => {
        const out = offsetPathData(rounded(), options({ offset: -12 }), 3);
        expect(out.includes('C')).toBe(false);
        expect(anchorCount(out)).toBe(4);
        expect(boxOf(out)).toEqual({ x: 12, y: 12, width: 16, height: 36 });
    });

    it("stays at the distance from a curved, concave outline", () => {
        const blob = 'M0 50 C0 0 40 30 60 0 C80 -30 120 20 100 60 C80 100 90 120 50 110 C10 100 0 90 0 50 Z';
        for (const offset of [5, -5]) {
            const out = offsetPathData(blob, options({ offset, joins: 'round' }), 3);
            expect(worstDistanceError(blob, out, offset)).toBeLessThan(0.1);
            expect(anchorCount(out)).toBeLessThan(30);
        }
    });

    it("removes what an inset closes up, and returns nothing when the shape is gone", () => {
        expect(offsetPathData(SQUARE, options({ offset: -6 }), 3)).toBe('');
        const dumbbell = 'M0 0 L20 0 L20 8 L30 8 L30 0 L50 0 L50 20 L30 20 L30 12 L20 12 L20 20 L0 20 Z';
        const out = offsetPathData(dumbbell, options({ offset: -3 }), 3);
        expect(pathDataToSubpaths(out)).toHaveLength(2);
    });

    it("merges parts that grow into each other", () => {
        const two = 'M0 0 L10 0 L10 10 L0 10 Z M14 0 L24 0 L24 10 L14 10 Z';
        const out = offsetPathData(two, options({ offset: 3 }), 3);
        expect(pathDataToSubpaths(out)).toHaveLength(1);
        expect(boxOf(out)).toEqual({ x: -3, y: -3, width: 30, height: 16 });
    });

    it("grows a ring outward and shrinks its hole", () => {
        const ring = 'M0 0 L40 0 L40 40 L0 40 Z M10 10 L30 10 L30 30 L10 30 Z';
        const out = offsetPathData(ring, { ...options({ offset: 2 }), fillRule: 'evenodd' }, 3);
        const subs = pathDataToSubpaths(out);
        expect(subs).toHaveLength(2);
        const boxes = subs.map((sub) => boxOf(subpathD(sub.anchors)));
        expect(boxes).toContainEqual({ x: -2, y: -2, width: 44, height: 44 });
        expect(boxes).toContainEqual({ x: 12, y: 12, width: 16, height: 16 });
    });

    it("outlines an open line on both sides, with ends that follow the joins", () => {
        const miter = offsetPathData('M0 0 L10 0', options({ offset: 2 }), 3);
        expect(anchorCount(miter)).toBe(4);
        expect(boxOf(miter)).toEqual({ x: -2, y: -2, width: 14, height: 4 });

        const bevel = offsetPathData('M0 0 L10 0', options({ offset: -2, joins: 'bevel' }), 3);
        expect(boxOf(bevel)).toEqual({ x: 0, y: -2, width: 10, height: 4 });

        const round = offsetPathData('M0 0 L10 0', options({ offset: 2, joins: 'round' }), 3);
        const box = boxOf(round);
        expect(box.x).toBeCloseTo(-2, 1);
        expect(box.width).toBeCloseTo(14, 1);
        expect(worstDistanceError('M0 0 L10 0', round, 2)).toBeLessThan(0.01);
    });
});

function subpathD(anchors: readonly Point[]): string {
    return `M${anchors.map((p) => `${p.x} ${p.y}`).join(' L')} Z`;
}
