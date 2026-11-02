import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    const storage = new Map<string, string>();
    Object.assign(globalThis, {
        localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
        window: { document: { documentElement: { classList: { add() { }, remove() { } } } }, matchMedia: () => ({ matches: false }) },
    });
});

import { type PathNode, type RectNode, type SvgNode, findNode } from "@/svg-core";
import { canExpandPaths, docState, expandPaths } from "..";

function path(id: string, d: string, attrs: Record<string, string> = {}): PathNode {
    return { id, kind: 'path', d, attrs: { id, ...attrs } };
}

function rect(id: string): RectNode {
    return { id, kind: 'rect', x: 0, y: 0, width: 4, height: 4, rx: 0, ry: 0, attrs: { id, fill: 'none', stroke: '#000', 'stroke-width': '2' } };
}

function load(...nodes: SvgNode[]): void {
    docState.doc.children = nodes;
}

describe("expand paths", () => {
    it("expands only the paths that have a stroke", () => {
        const stroked = path('a', 'M0 0 L10 0', { fill: 'none', stroke: '#f00', 'stroke-width': '2' });
        const plain = path('b', 'M0 0 L10 0', { fill: '#00f', stroke: 'none' });
        const shape = rect('c');
        load(stroked, plain, shape);

        expect(canExpandPaths(['a', 'b', 'c'])).toBe(true);
        expect(canExpandPaths(['b', 'c'])).toBe(false);

        const next = expandPaths(['a', 'b', 'c']);

        expect(next).toEqual(['a', 'b', 'c']);
        const a = findNode(docState.doc, 'a')!.node as PathNode;
        expect(a.d).toBe("M10 1 L0 1 L0 -1 L10 -1 Z");
        expect(a.attrs.fill).toBe('#f00');
        expect(a.attrs.stroke).toBe('none');
        expect((findNode(docState.doc, 'b')!.node as PathNode).d).toBe('M0 0 L10 0');
        expect(findNode(docState.doc, 'c')!.node.kind).toBe('rect');
        expect(expandPaths(['b', 'c'])).toBeUndefined();
    });

    it("adds the stroke outline after the fill when the paints differ", () => {
        load(path('a', 'M0 0 L10 0 L10 10 L0 10 Z', { fill: '#00f', stroke: '#f00', 'stroke-width': '2' }));

        const next = expandPaths(['a']);

        expect(next?.[0]).toBe('a');
        expect(next).toHaveLength(2);
        expect(docState.doc.children).toHaveLength(2);
        const fill = docState.doc.children[0] as PathNode;
        const stroke = docState.doc.children[1] as PathNode;
        expect(fill.id).toBe('a');
        expect(fill.d).toBe('M0 0 L10 0 L10 10 L0 10 Z');
        expect(fill.attrs.stroke).toBe('none');
        expect(fill.attrs.fill).toBe('#00f');
        expect(stroke.id).toBe(next![1]);
        expect(stroke.attrs.fill).toBe('#f00');
        expect(stroke.attrs.stroke).toBe('none');
        expect(stroke.attrs.id).toBeUndefined();
    });
});
