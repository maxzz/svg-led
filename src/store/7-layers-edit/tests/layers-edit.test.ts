import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    // the document store loads app settings, which read localStorage and apply the theme to the page
    const storage = new Map<string, string>();
    Object.assign(globalThis, {
        localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
        window: { document: { documentElement: { classList: { add() { }, remove() { } } } }, matchMedia: () => ({ matches: false }) },
    });
});

import { type Attrs, type GroupNode, type RectNode, type SvgNode, findNode } from "@/svg-core";
import { docState } from "../../3-document";
import { moveLayers, renameLayer, setLayerFlag } from "..";

/** Node ids equal the id attributes, so tests can name nodes by either */
function rect(id: string, x = 0, y = 0, attrs: Attrs = {}): RectNode {
    return { id, kind: 'rect', x, y, width: 1, height: 1, rx: 0, ry: 0, attrs: { id, ...attrs } };
}

function group(id: string, children: SvgNode[], attrs: Attrs = {}): GroupNode {
    return { id, kind: 'g', children, attrs: { id, ...attrs } };
}

function load(...nodes: SvgNode[]): void {
    docState.doc.children = nodes;
}

const order = (nodes: readonly SvgNode[]) => nodes.map((n) => n.id);

describe('moveLayers', () => {
    it('moves a layer above another one in the same parent', () => {
        load(rect('a'), rect('b'), rect('c'));
        expect(moveLayers(['a'], { targetId: 'c', place: 'above' })).toBe(true);
        expect(order(docState.doc.children)).toEqual(['b', 'c', 'a']);
    });

    it('moves into a translated group without moving on the canvas', () => {
        load(group('g', [rect('r')], { transform: 'translate(10 20)' }), rect('a', 15, 25));
        expect(moveLayers(['a'], { targetId: 'g', place: 'inside' })).toBe(true);
        expect(order((docState.doc.children[0] as GroupNode).children)).toEqual(['r', 'a']);
        const a = findNode(docState.doc, 'a')!.node as RectNode;
        expect([a.x, a.y]).toEqual([5, 5]);
    });

    it('moves out of a group to the top level, below a sibling', () => {
        load(rect('x'), group('g', [rect('a', 1, 1)], { transform: 'translate(10 20)' }));
        expect(moveLayers(['a'], { targetId: 'x', place: 'below' })).toBe(true);
        expect(order(docState.doc.children)).toEqual(['a', 'x', 'g']);
        const a = docState.doc.children[0] as RectNode;
        expect([a.x, a.y]).toEqual([11, 21]);
    });

    it('keeps the stacking order of several moved layers', () => {
        load(rect('a'), rect('b'), rect('c'), rect('d'));
        moveLayers(['c', 'a'], { targetId: 'd', place: 'above' });
        expect(order(docState.doc.children)).toEqual(['b', 'd', 'a', 'c']);
    });

    it('refuses to put a group inside itself, and reports drops that change nothing', () => {
        load(group('g', [group('inner', [])]), rect('a'));
        expect(moveLayers(['g'], { targetId: 'inner', place: 'inside' })).toBe(false);
        expect(moveLayers(['a'], { targetId: 'g', place: 'above' })).toBe(false);
    });
});

describe('renameLayer', () => {
    it('sets, normalizes and removes the id attribute', () => {
        load(rect('a'), { ...rect('b'), attrs: {} });
        expect(renameLayer('b', ' my  shape ')).toEqual({ ok: true });
        expect(docState.doc.children[1].attrs.id).toBe('my_shape');
        expect(renameLayer('b', '')).toEqual({ ok: true });
        expect(docState.doc.children[1].attrs.id).toBeUndefined();
    });

    it('rejects duplicate and invalid ids', () => {
        load(rect('a'), rect('b'));
        expect(renameLayer('b', 'a').ok).toBe(false);
        expect(renameLayer('b', '1st').ok).toBe(false);
        expect(docState.doc.children[1].attrs.id).toBe('b');
    });
});

describe('setLayerFlag', () => {
    it('hides and locks through attributes', () => {
        load(rect('a'));
        setLayerFlag('a', 'hidden', true);
        setLayerFlag('a', 'locked', true);
        expect(docState.doc.children[0].attrs).toMatchObject({ display: 'none', 'data-locked': 'true' });
        setLayerFlag('a', 'locked', false);
        expect(docState.doc.children[0].attrs['data-locked']).toBeUndefined();
    });
});
