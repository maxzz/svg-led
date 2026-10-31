import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    const storage = new Map<string, string>();
    Object.assign(globalThis, {
        localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) },
        window: { document: { documentElement: { classList: { add() { }, remove() { } } } }, matchMedia: () => ({ matches: false }) },
    });
});

import { type SvgDoc } from "@/svg-core";
import { isolationLevels, jumpIsolationStack, nestIsolationStack, popIsolationStack, pruneIsolationStack } from "../2-isolation-atoms";

// <g A> [ <rect a1/>, <g B> [ <rect b1/>, <g C> [ <rect c1/> ] ] ]
const doc = {
    children: [
        {
            kind: 'g', id: 'A', attrs: { id: 'A' }, children: [
                { kind: 'rect', id: 'a1', attrs: { id: 'a1' } },
                {
                    kind: 'g', id: 'B', attrs: { id: 'B' }, children: [
                        { kind: 'rect', id: 'b1', attrs: {} },
                        { kind: 'g', id: 'C', attrs: {}, children: [{ kind: 'rect', id: 'c1', attrs: {} }] },
                    ],
                },
            ],
        },
    ],
} as unknown as SvgDoc;

const ids = (stack: readonly (readonly string[])[]) => stack.map((frame) => [...frame]);

describe('nestIsolationStack', () => {
    it('records the groups around a single object entered from the document', () => {
        expect(ids(nestIsolationStack(doc, [], ['C'])!)).toEqual([['A'], ['B'], ['C']]);
        expect(ids(nestIsolationStack(doc, [], ['A'])!)).toEqual([['A']]);
    });

    it('starts a multi-object isolation as one level', () => {
        expect(ids(nestIsolationStack(doc, [], ['a1', 'B'])!)).toEqual([['a1', 'B']]);
    });

    it('nests a selection under the isolation that is already open', () => {
        const inA = nestIsolationStack(doc, [], ['A'])!;
        const nested = nestIsolationStack(doc, inA, ['a1', 'B'])!;
        expect(ids(nested)).toEqual([['A'], ['a1', 'B']]);
        expect(isolationLevels(doc, nested).map((level) => level.label)).toEqual(['A', '2 objects']);
    });

    it('nests a double-clicked element under the current level and keeps the groups between them', () => {
        const inA = nestIsolationStack(doc, [], ['A'])!;
        const nested = nestIsolationStack(doc, inA, ['C'])!;
        expect(ids(nested)).toEqual([['A'], ['B'], ['C']]);
        expect(isolationLevels(doc, nested).map((level) => level.label)).toEqual(['A', 'B', '<Group>']);
    });

    it('nests one of several isolated objects without dropping that level', () => {
        const many = nestIsolationStack(doc, nestIsolationStack(doc, [], ['A'])!, ['a1', 'B'])!;
        const deeper = nestIsolationStack(doc, many, ['b1'])!;
        expect(ids(deeper)).toEqual([['A'], ['a1', 'B'], ['b1']]);
        expect(isolationLevels(doc, deeper).map((level) => level.label)).toEqual(['A', '2 objects', '<Rect>']);
    });

    it('does nothing when the active level is already that scope', () => {
        const inA = nestIsolationStack(doc, [], ['A'])!;
        expect(nestIsolationStack(doc, inA, ['A'])).toBeNull();
        expect(nestIsolationStack(doc, inA, [])).toBeNull();
    });
});

describe('jumpIsolationStack', () => {
    const stack = () => nestIsolationStack(doc, nestIsolationStack(doc, [], ['A'])!, ['a1', 'b1'])!;

    it('returns to the parent level and selects the objects that were inside it', () => {
        const next = jumpIsolationStack(stack(), 'A')!;
        expect(ids(next.stack)).toEqual([['A']]);
        expect([...next.select]).toEqual(['a1', 'b1']);
    });

    it('leaves every level only when the document crumb is chosen', () => {
        const next = jumpIsolationStack(stack(), null)!;
        expect(next.stack).toEqual([]);
        expect([...next.select]).toEqual(['A']);
    });

    it('ignores the active crumb and an unknown id', () => {
        const levels = isolationLevels(doc, stack());
        expect(jumpIsolationStack(stack(), levels[1].id)).toBeNull();
        expect(jumpIsolationStack(stack(), 'missing')).toBeNull();
        expect(jumpIsolationStack([], null)).toBeNull();
    });
});

describe('popIsolationStack', () => {
    it('steps back one nested level', () => {
        const stack = nestIsolationStack(doc, nestIsolationStack(doc, [], ['A'])!, ['C'])!;
        const once = popIsolationStack(stack)!;
        expect(ids(once.stack)).toEqual([['A'], ['B']]);
        expect([...once.select]).toEqual(['C']);
        const twice = popIsolationStack(once.stack)!;
        expect(ids(twice.stack)).toEqual([['A']]);
        expect([...twice.select]).toEqual(['B']);
    });

    it('leaves isolation from the outermost level', () => {
        const left = popIsolationStack([['A']])!;
        expect(left.stack).toEqual([]);
        expect([...left.select]).toEqual(['A']);
        expect(popIsolationStack([])).toBeNull();
    });
});

describe('pruneIsolationStack', () => {
    it('drops a level whose objects are gone, and the levels nested inside it', () => {
        const onlyA = { children: [{ kind: 'g', id: 'A', attrs: {}, children: [] }] } as unknown as SvgDoc;
        expect(ids(pruneIsolationStack(onlyA, [['A'], ['B'], ['c1']]))).toEqual([['A']]);
        expect(pruneIsolationStack({ children: [] } as unknown as SvgDoc, [['A']])).toEqual([]);
    });

    it('keeps the same stack when every object is still there', () => {
        const stack = nestIsolationStack(doc, [], ['B'])!;
        expect(pruneIsolationStack(doc, stack)).toBe(stack);
    });

    it('keeps a level that lost only some of its objects', () => {
        const left = {
            children: [
                { kind: 'rect', id: 'a1', attrs: {} },
                { kind: 'rect', id: 'b1', attrs: {} },
            ],
        } as unknown as SvgDoc;
        expect(ids(pruneIsolationStack(left, [['a1', 'B'], ['b1']]))).toEqual([['a1'], ['b1']]);
    });
});
