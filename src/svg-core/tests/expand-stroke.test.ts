import { describe, expect, it } from "vitest";
import { type PathNode, type PathSeg, type SvgNode, classRulesOf, expandPathNode, parsePathData, shapeToPath, subpathCount } from "../index";

function path(d: string, attrs: Record<string, string> = {}): PathNode {
    return { id: 'p', kind: 'path', d, attrs };
}

function bounds(d: string): { minX: number; minY: number; maxX: number; maxY: number; } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const take = (p: { x: number; y: number; }) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    };
    for (const s of parsePathData(d)) {
        if (s.c === 'M' || s.c === 'L') {
            take(s.p);
        } else if (s.c === 'C') {
            take(s.c1); take(s.c2); take(s.p);
        } else if (s.c === 'Q') {
            take(s.q); take(s.p);
        } else if (s.c === 'A') {
            take(s.p);
        }
    }
    return { minX, minY, maxX, maxY };
}

/** Absolute area of each closed subpath */
function areas(d: string): number[] {
    const rv: number[] = [];
    let start = { x: 0, y: 0 };
    let cur = { x: 0, y: 0 };
    let acc = 0;
    const close = () => {
        acc += cur.x * start.y - start.x * cur.y;
        rv.push(Math.abs(acc / 2));
        acc = 0;
        cur = start;
    };
    for (const s of parsePathData(d) as PathSeg[]) {
        if (s.c === 'M') {
            start = cur = s.p;
        } else if (s.c === 'L') {
            acc += cur.x * s.p.y - s.p.x * cur.y;
            cur = s.p;
        } else if (s.c === 'Z') {
            close();
        }
    }
    return rv;
}

const LINE = "M0 0 L10 0";
const SQUARE = "M0 0 L10 0 L10 10 L0 10 Z";

describe("expand stroke", () => {
    it("does nothing when the path has no stroke", () => {
        expect(expandPathNode(path(LINE, { fill: '#f00' }))).toBeUndefined();
        expect(expandPathNode(path(LINE, { fill: 'none', stroke: 'none', 'stroke-width': '4' }))).toBeUndefined();
        expect(expandPathNode(path(LINE, { fill: 'none', stroke: '#000', 'stroke-width': '0' }))).toBeUndefined();
        expect(expandPathNode(path(LINE, { fill: 'none', stroke: '#000', 'stroke-width': '10%' }))).toBeUndefined();
    });

    it("outlines an open stroke as a filled path and drops the stroke", () => {
        const [out] = expandPathNode(path(LINE, { fill: 'none', stroke: '#f00', 'stroke-width': '2' }), [], 3)!;

        expect(out.id).toBe('p');
        expect(out.d).toBe("M10 1 L0 1 L0 -1 L10 -1 Z");
        expect(out.attrs.fill).toBe('#f00');
        expect(out.attrs.stroke).toBe('none');
        expect(out.attrs['stroke-width']).toBeUndefined();
    });

    it("extends square and round caps past the endpoints", () => {
        const square = expandPathNode(path(LINE, { fill: 'none', stroke: '#000', 'stroke-width': '2', 'stroke-linecap': 'square' }), [], 3)!;
        expect(square).toHaveLength(1);
        expect(square[0].d).toBe("M11 1 L-1 1 L-1 -1 L11 -1 Z");

        const round = expandPathNode(path(LINE, { fill: 'none', stroke: '#000', 'stroke-width': '2', 'stroke-linecap': 'round' }), [], 3)!;
        const b = bounds(round[0].d);
        expect(b.minX).toBeCloseTo(-1, 1);
        expect(b.maxX).toBeCloseTo(11, 1);
        expect(b.minY).toBeCloseTo(-1, 1);
        expect(b.maxY).toBeCloseTo(1, 1);
    });

    it("uses miter and bevel joins", () => {
        const attrs = { fill: 'none', stroke: '#000', 'stroke-width': '2', 'stroke-linecap': 'butt' };
        const miter = expandPathNode(path("M0 0 L10 0 L10 10", { ...attrs, 'stroke-linejoin': 'miter' }), [], 3)!;
        const bevel = expandPathNode(path("M0 0 L10 0 L10 10", { ...attrs, 'stroke-linejoin': 'bevel' }), [], 3)!;

        expect(miter[0].d).toContain("11 -1");
        expect(bevel[0].d).not.toContain("11 -1");
        expect(bevel[0].d).toContain("10 -1");
    });

    it("turns a closed stroke into a ring", () => {
        const [out] = expandPathNode(path(SQUARE, { fill: 'none', stroke: '#111', 'stroke-width': '2' }), [], 3)!;

        expect(subpathCount(out.d)).toBe(2);
        expect(out.attrs['fill-rule']).toBe('nonzero');
        const boxes = subBoxes(out.d);
        expect(boxes).toEqual(expect.arrayContaining([
            { minX: -1, minY: -1, maxX: 11, maxY: 11 },
            { minX: 1, minY: 1, maxX: 9, maxY: 9 },
        ]));
    });

    it("unites a fill and a stroke of the same opaque color into one path", () => {
        const [out] = expandPathNode(path(SQUARE, { fill: '#F00', stroke: '#f00', 'stroke-width': '2' }), [], 3)!;

        expect(out.d).toBe("M11 11 L-1 11 L-1 -1 L11 -1 Z");
        expect(out.attrs.fill).toBe('#F00');
        expect(out.attrs.stroke).toBe('none');
        expect(subpathCount(out.d)).toBe(1);
    });

    it("keeps a different fill and puts the stroke outline above it", () => {
        const node = path(SQUARE, { id: 'shape', fill: '#00f', stroke: '#f00', 'stroke-width': '2' });
        const parts = expandPathNode(node, [], 3)!;

        expect(parts).toHaveLength(2);
        expect(parts[0].id).toBe('p');
        expect(parts[0].d).toBe(SQUARE);
        expect(parts[0].attrs.fill).toBe('#00f');
        expect(parts[0].attrs.stroke).toBe('none');
        expect(parts[0].attrs.id).toBe('shape');

        expect(parts[1].id).not.toBe('p');
        expect(parts[1].attrs.id).toBeUndefined();
        expect(parts[1].attrs.fill).toBe('#f00');
        expect(parts[1].attrs.stroke).toBe('none');
        expect(subpathCount(parts[1].d)).toBe(2);
    });

    it("does not unite translucent paints, so the stroke still composites over the fill", () => {
        const parts = expandPathNode(path(SQUARE, {
            fill: '#f00', stroke: '#f00', 'stroke-width': '2', 'fill-opacity': '0.5', 'stroke-opacity': '0.5',
        }), [], 3)!;

        expect(parts).toHaveLength(2);
        expect(parts[0].d).toBe(SQUARE);
        expect(parts[1].attrs['fill-opacity']).toBe('0.5');
    });

    it("breaks a dash pattern into separate outlines", () => {
        const [out] = expandPathNode(path(LINE, {
            fill: 'none', stroke: '#000', 'stroke-width': '2', 'stroke-dasharray': '2 2',
        }), [], 3)!;

        expect(subpathCount(out.d)).toBe(3);
        expect(areas(out.d).reduce((sum, n) => sum + n, 0)).toBeCloseTo(12, 3);
        const b = bounds(out.d);
        expect(b).toEqual({ minX: 0, minY: -1, maxX: 10, maxY: 1 });
    });

    it("reads a stroke that lives on a class, and does not leave the class in place", () => {
        const style: SvgNode = {
            id: 'css', kind: 'passthrough', tag: 'defs', attrs: {},
            inner: `<style>
      .cls-1 { stroke: #000; }
      .cls-1, .cls-2 { fill: none; }
      .cls-2 { stroke-width: 3px; }
      .cls-2, .cls-3 { stroke: #fff; }
      .cls-3 { fill: #fff; stroke-linejoin: round; stroke-width: 2px; }
    </style>`,
        };
        const rules = classRulesOf([style]);
        const ink = expandPathNode(path(LINE, { class: 'ink' }), [], 3, undefined, classRulesOf([{
            id: 's', kind: 'passthrough', tag: 'style', attrs: {},
            inner: '.ink, .other { fill: none; } .ink { stroke: #0f0; stroke-width: 4px; }',
        }]))!;
        expect(ink[0].attrs.fill).toBe('#0f0');
        expect(ink[0].attrs.class).toBeUndefined();
        expect(bounds(ink[0].d)).toEqual({ minX: 0, minY: -2, maxX: 10, maxY: 2 });

        const cursor = expandPathNode(path("M1 1 L10 1 L10 14 Z", { class: 'cls-3' }), [], 3, undefined, rules)!;
        expect(cursor).toHaveLength(1);
        expect(cursor[0].attrs.fill?.toLowerCase()).toBe('#fff');
        expect(cursor[0].attrs.stroke).toBe('none');
        expect(cursor[0].attrs.class).toBeUndefined();
    });

    it("reads a stroke inherited from a parent, and an explicit none blocks it", () => {
        const parent = { attrs: { stroke: '#111', 'stroke-width': '4' } };
        const [out] = expandPathNode(path(LINE, { fill: 'none' }), [parent], 3)!;
        expect(out.attrs.fill).toBe('#111');
        expect(bounds(out.d)).toEqual({ minX: 0, minY: -2, maxX: 10, maxY: 2 });

        expect(expandPathNode(path(LINE, { fill: 'none', stroke: 'none' }), [parent], 3)).toBeUndefined();
    });

    it("keeps the corners of a rounded rectangle as curves, not as many short lines", () => {
        const rect = shapeToPath({ id: 'r', kind: 'rect', x: 0, y: 0, width: 160, height: 100, rx: 25, ry: 25, attrs: {} }, 3).d;
        const [out] = expandPathNode(path(rect, { fill: 'none', stroke: '#000', 'stroke-width': '10' }), [], 3)!;
        const segs = parsePathData(out.d);
        expect(subpathCount(out.d)).toBe(2);
        expect(segs.filter((s) => s.c === 'L')).toHaveLength(8);
        expect(segs.filter((s) => s.c === 'C')).toHaveLength(8);
        expect(subBoxes(out.d.replace(/C[^LZ]*/g, ''))).toEqual(expect.arrayContaining([
            { minX: -5, minY: -5, maxX: 165, maxY: 105 },
            { minX: 5, minY: 5, maxX: 155, maxY: 95 },
        ]));
    });

    it("outlines a curve", () => {
        const [out] = expandPathNode(path("M0 0 C0 0 10 0 10 10", { fill: 'none', stroke: '#000', 'stroke-width': '2' }), [], 3)!;
        const b = bounds(out.d);
        expect(b.minX).toBeLessThan(0);
        expect(b.minY).toBeLessThan(0);
        expect(b.maxX).toBeGreaterThan(10);
        expect(b.maxY).toBeGreaterThan(10);
        expect(out.d.endsWith('Z')).toBe(true);
    });
});

function subBoxes(d: string): { minX: number; minY: number; maxX: number; maxY: number; }[] {
    const rv: { minX: number; minY: number; maxX: number; maxY: number; }[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let open = false;
    const take = (p: { x: number; y: number; }) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    };
    const close = () => {
        if (open) {
            rv.push({ minX, minY, maxX, maxY });
        }
        minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
        open = false;
    };
    for (const s of parsePathData(d)) {
        if (s.c === 'M') {
            close();
            open = true;
            take(s.p);
        } else if (s.c === 'L') {
            take(s.p);
        } else if (s.c === 'Z') {
            close();
        }
    }
    close();
    return rv;
}
