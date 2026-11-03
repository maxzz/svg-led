import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    const storage = new Map<string, string>();
    Object.assign(globalThis, {
        localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
        window: { document: { documentElement: { classList: { add() { }, remove() { } } } }, matchMedia: () => ({ matches: false }) },
    });
});

import { type PathNode, type RectNode, type SvgNode, findNode } from "@/svg-core";
import { docState } from "@/store/3-document";
import { applyOffsetPaths } from "./2-apply-offset";

function path(id: string, d: string, attrs: Record<string, string> = {}): PathNode {
    return { id, kind: 'path', d, attrs: { id, ...attrs } };
}

function rect(id: string): RectNode {
    return { id, kind: 'rect', x: 0, y: 0, width: 4, height: 4, rx: 0, ry: 0, attrs: { id } };
}

function load(...nodes: SvgNode[]): void {
    docState.doc.children = nodes;
}

const OPTS = { offset: 1, joins: 'miter' as const, miterLimit: 4 };

describe("apply offset paths", () => {
    it("inserts an offset copy after each path and leaves the original", () => {
        load(
            path('a', 'M0 0 L10 0 L10 10 L0 10 Z', { fill: '#00f' }),
            path('b', 'M0 0 L4 0', { stroke: '#111' }),
            rect('c'),
        );

        const created = applyOffsetPaths(['a', 'c', 'b', 'a'], OPTS);

        expect(created).toHaveLength(2);
        expect(docState.doc.children.map((n) => n.id)).toEqual(['a', created[0], 'b', created[1], 'c']);
        expect((findNode(docState.doc, 'a')!.node as PathNode).d).toBe('M0 0 L10 0 L10 10 L0 10 Z');
        const copy = findNode(docState.doc, created[0])!.node as PathNode;
        expect(copy.attrs.id).toBeUndefined();
        expect(copy.attrs.fill).toBe('#00f');
        expect(copy.d).not.toBe('M0 0 L10 0 L10 10 L0 10 Z');
        expect(findNode(docState.doc, 'c')!.node.kind).toBe('rect');
    });

    it("adds nothing when an inward offset closes the shape up", () => {
        load(path('a', 'M0 0 L2 0 L2 2 L0 2 Z'));
        const created = applyOffsetPaths(['a'], { ...OPTS, offset: -20 });
        expect(created).toHaveLength(0);
        expect(docState.doc.children).toHaveLength(1);
    });
});
