import { describe, expect, it } from "vitest";
import {
    type SvgDoc, type SvgNode, type GroupNode, reuseNodeIds, applyMatrix, buildSourceMap, cubicBBox, cubicPoint, deleteAnchors, fitRectMatrix, getPresentation, insertAnchor,
    invert, multiply, nearestSegment, nodeAtOffset, parsePathData, parseTransform, pathDataToSubpaths, rotateMatrix, scanElements,
    serializeSvg, setHandle, setPresentation, shapeToSubpaths, subpathsToPathData, toggleAnchorKind, transformNode, transformPathData,
    uniformPadding, localBBox,
} from "../index";

describe("path data", () => {
    it("normalizes relative, H/V, S and T commands", () => {
        const segs = parsePathData("m10 10 h10 v10 s5 5 10 0 t10 0 z");
        expect(segs.map((s) => s.c).join('')).toBe('MLLCQZ');
        expect(segs[1]).toEqual({ c: 'L', p: { x: 20, y: 10 } });
        expect(segs[2]).toEqual({ c: 'L', p: { x: 20, y: 20 } });
    });

    it("parses packed numbers and arc flags", () => {
        const segs = parsePathData("M0,0L.5.5-1-1A5 5 0 01 10 10");
        expect(segs[1]).toEqual({ c: 'L', p: { x: 0.5, y: 0.5 } });
        expect(segs[2]).toEqual({ c: 'L', p: { x: -1, y: -1 } });
        expect(segs[3]).toMatchObject({ c: 'A', large: false, sweep: true, p: { x: 10, y: 10 } });
    });
});

describe("anchors", () => {
    it("round-trips lines and cubics and merges the closing point", () => {
        const subs = pathDataToSubpaths("M0 0 L10 0 C15 0 20 5 20 10 L0 0 Z");
        expect(subs).toHaveLength(1);
        expect(subs[0].closed).toBe(true);
        expect(subs[0].anchors).toHaveLength(3);
        expect(subpathsToPathData(subs, 3)).toBe("M0 0 L10 0 C15 0 20 5 20 10 Z");
    });

    it("infers smooth and corner kinds", () => {
        const subs = pathDataToSubpaths("M0 0 C0 10 10 10 10 0 C10 -10 20 -10 20 0");
        expect(subs[0].anchors[0].kind).toBe('cusp');
        expect(subs[0].anchors[1].kind).toBe('smooth');
        expect(pathDataToSubpaths("M0 0 L10 0")[0].anchors[0].kind).toBe('corner');
    });

    it("inserting an anchor keeps the curve shape", () => {
        const subs = pathDataToSubpaths("M0 0 C0 50 100 50 100 0");
        const before: [any, any, any, any] = [{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 0 }];
        const key = insertAnchor(subs, 0, 0, 0.3);
        expect(key).toBe('0:1');
        const mid = subs[0].anchors[1];
        const expected = cubicPoint(before, 0.3);
        expect(mid.x).toBeCloseTo(expected.x);
        expect(mid.y).toBeCloseTo(expected.y);
        expect(mid.kind).toBe('smooth');
    });

    it("smooth handle drag keeps the opposite handle colinear with its own length", () => {
        const a = { x: 0, y: 0, in: { x: -10, y: 0 }, out: { x: 5, y: 0 }, kind: 'smooth' as const };
        setHandle(a, 'out', { x: 0, y: 20 }, false);
        expect(a.in.x).toBeCloseTo(0);
        expect(a.in.y).toBeCloseTo(-10);
        setHandle(a, 'out', { x: 20, y: 20 }, true);
        expect(a.kind).toBe('cusp');
    });

    it("toggles corner and smooth, and deletes anchors", () => {
        const subs = pathDataToSubpaths("M0 0 L10 0 L20 0");
        toggleAnchorKind(subs[0], 1);
        expect(subs[0].anchors[1].kind).toBe('smooth');
        toggleAnchorKind(subs[0], 1);
        expect(subs[0].anchors[1].in).toBeUndefined();
        const rest = deleteAnchors(subs, new Set(['0:1']));
        expect(rest[0].anchors).toHaveLength(2);
        expect(deleteAnchors(rest, new Set(['0:0']))).toHaveLength(0);
    });

    it("finds the nearest segment", () => {
        const subs = pathDataToSubpaths("M0 0 L10 0 L10 10");
        const hit = nearestSegment(subs, { x: 9, y: 5 })!;
        expect(hit.seg).toBe(1);
        expect(hit.dist).toBeCloseTo(1);
    });
});

describe("geometry", () => {
    it("matrix inverse and transform parsing", () => {
        const m = parseTransform("translate(10 20) rotate(30) scale(2)");
        const p = applyMatrix(multiply(invert(m), m), { x: 3, y: 4 });
        expect(p.x).toBeCloseTo(3);
        expect(p.y).toBeCloseTo(4);
        const r = applyMatrix(rotateMatrix(90), { x: 1, y: 0 });
        expect(r.x).toBeCloseTo(0);
        expect(r.y).toBeCloseTo(1);
    });

    it("cubic bbox includes extrema", () => {
        const b = cubicBBox([{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 10, y: 40 }, { x: 10, y: 0 }]);
        expect(b.height).toBeCloseTo(30);
        expect(b.width).toBeCloseTo(10);
    });

    it("rect outline and bbox", () => {
        const rect = { id: 'r', kind: 'rect' as const, x: 0, y: 0, width: 20, height: 10, rx: 2, ry: 2, attrs: {} };
        expect(shapeToSubpaths(rect)[0].anchors).toHaveLength(8);
        expect(localBBox(rect)).toEqual({ x: 0, y: 0, width: 20, height: 10 });
    });
});

describe("ops", () => {
    it("keeps arcs under translate and uniform scale", () => {
        expect(transformPathData("M0 0 A5 5 0 0 1 10 0", [2, 0, 0, 2, 1, 1], 3)).toBe("M1 1 A10 10 0 0 1 21 1");
    });

    it("converts arcs to cubics under skew", () => {
        expect(transformPathData("M0 0 A5 5 0 0 1 10 0", [1, 0, 0.5, 1, 0, 0], 3)).toMatch(/^M0 0 C/);
    });

    it("bakes axis-aligned transforms into rects and falls back to transform attribute", () => {
        const rect = { id: 'r', kind: 'rect' as const, x: 0, y: 0, width: 10, height: 10, rx: 0, ry: 0, attrs: {} };
        expect(transformNode(rect, [2, 0, 0, 2, 5, 5], 3)).toMatchObject({ x: 5, y: 5, width: 20, height: 20 });
        const rotated = transformNode(rect, rotateMatrix(45), 3);
        expect(rotated.attrs.transform).toMatch(/^matrix\(/);
    });

    it("fits a rect into a padded box keeping aspect", () => {
        const m = fitRectMatrix({ x: 0, y: 0, width: 10, height: 5 }, { x: 0, y: 0, width: 100, height: 100 }, { padding: uniformPadding(10), keepAspect: true, center: true });
        const tl = applyMatrix(m, { x: 0, y: 0 });
        const br = applyMatrix(m, { x: 10, y: 5 });
        expect(tl.x).toBeCloseTo(10);
        expect(br.x).toBeCloseTo(90);
        expect(tl.y).toBeCloseTo(30);
        expect(br.y).toBeCloseTo(70);
    });
});

describe("serialize and source map", () => {
    const doc: SvgDoc = {
        viewBox: { x: 0, y: 0, width: 24, height: 24 },
        rootAttrs: { xmlns: 'http://www.w3.org/2000/svg' },
        children: [
            { id: 'a', kind: 'path', d: 'M0 0 L10 10', attrs: { fill: 'none' } },
            { id: 'g', kind: 'g', attrs: {}, children: [{ id: 'c', kind: 'circle', cx: 5, cy: 5, r: 2.5, attrs: {} }] },
            { id: 't', kind: 'passthrough', tag: 'text', inner: '<tspan>hi</tspan>', attrs: { x: '1' } },
            { id: 'r', kind: 'rect', x: 0, y: 0, width: 1, height: 1, rx: 0, ry: 0, attrs: {} },
        ],
    };

    it("pretty-prints one element per line", () => {
        const text = serializeSvg(doc, { precision: 3 });
        expect(text.split('\n')[1]).toBe('    <path d="M0 0 L10 10" fill="none"/>');
        expect(text).toContain('<circle cx="5" cy="5" r="2.5"/>');
    });

    it("maps nodes to lines, skipping passthrough descendants", () => {
        const text = serializeSvg(doc, { precision: 3 });
        const map = buildSourceMap(text, doc);
        expect(map.get('a')?.startLine).toBe(2);
        expect(map.get('g')).toMatchObject({ startLine: 3, endLine: 5 });
        expect(map.get('c')?.startLine).toBe(4);
        expect(map.get('t')?.startLine).toBe(6);
        expect(map.get('r')?.startLine).toBe(7);
        expect(nodeAtOffset(map, text.indexOf('<circle') + 2)).toBe('c');
    });

    it("scanner skips comments and quoted '>'", () => {
        expect(scanElements('<svg><!-- <a/> --><path d="a>b"/></svg>')).toHaveLength(2);
    });

    it("reuses ids by pre-order position when the kind matches", () => {
        const next: SvgNode[] = [
            { id: 'x1', kind: 'path', d: 'M1 1', attrs: {} },
            { id: 'x2', kind: 'g', attrs: {}, children: [{ id: 'x3', kind: 'ellipse', cx: 0, cy: 0, rx: 1, ry: 1, attrs: {} }] },
            { id: 'x4', kind: 'passthrough', tag: 'text', inner: '', attrs: {} },
        ];
        reuseNodeIds(doc.children, next);
        expect(next[0].id).toBe('a');
        expect(next[1].id).toBe('g');
        expect((next[1] as GroupNode).children[0].id).toBe('x3'); // circle became an ellipse
        expect(next[2].id).toBe('t');
    });
});

describe("presentation", () => {
    it("reads style first and removes the style entry on write", () => {
        const attrs: Record<string, string> = { fill: 'red', style: 'fill:blue;stroke:black' };
        expect(getPresentation(attrs, 'fill')).toBe('blue');
        setPresentation(attrs, 'fill', 'green');
        expect(attrs).toEqual({ fill: 'green', style: 'stroke:black' });
    });
});
