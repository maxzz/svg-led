import { describe, expect, it } from "vitest";
import { type Point, type Rect } from "@/svg-core";
import { type Polyline, lassoHits, simplifyLasso } from "../2-lasso";

const square = (x: number, y: number, s: number): Point[] => [{ x, y }, { x: x + s, y }, { x: x + s, y: y + s }, { x, y: y + s }];
const boxPoly = (r: Rect): Polyline => [...square(r.x, r.y, r.width)];

// Lasso: square 0..100
const lasso = square(0, 0, 100);

describe('lassoHits', () => {
    const boxes = new Map<string, Rect>([
        ['inside', { x: 10, y: 10, width: 20, height: 20 }],
        ['crossing', { x: 90, y: 40, width: 60, height: 20 }],
        ['outside', { x: 200, y: 200, width: 10, height: 10 }],
        ['around', { x: -50, y: -50, width: 200, height: 200 }],
    ]);
    const lines = (id: string) => [boxPoly(boxes.get(id)!)];

    it('inclusive selects only elements lying entirely inside the lasso', () => {
        expect(lassoHits(lasso, boxes, lines, true)).toEqual(['inside']);
    });

    it('exclusive selects every element the lasso touches', () => {
        expect(lassoHits(lasso, boxes, lines, false).sort()).toEqual(['crossing', 'inside']);
    });

    it('does not select an element that only surrounds the lasso', () => {
        expect(lassoHits(lasso, boxes, lines, false)).not.toContain('around');
    });

    it('selects nothing for a lasso with fewer than three points', () => {
        expect(lassoHits([{ x: 0, y: 0 }, { x: 50, y: 50 }], boxes, lines, false)).toEqual([]);
    });
});

describe('simplifyLasso', () => {
    it('keeps the corners of a path and drops collinear points', () => {
        const path = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
        expect(simplifyLasso(path, 0.5)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    });
});
