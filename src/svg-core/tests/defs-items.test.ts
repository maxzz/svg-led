import { describe, expect, it } from "vitest";
import { type SvgDoc, type SvgNode, buildSourceMap, defsClassId, defsElementId, defsIdsForClassesOf, defsItemsOf, isDefsItemOf, parseDefsItemId, setDefsClassActiveInMarkup } from "../index";

const style = (css: string) => `<style>${css}</style>`;
const defs = (id: string, inner: string): SvgNode => ({ id, kind: 'passthrough', tag: 'defs', inner, attrs: {} });
const path = (id: string, cls?: string): SvgNode => ({ id, kind: 'path', d: 'M0 0', attrs: cls ? { class: cls } : {} });

describe("defsItemsOf", () => {
    it("lists each class of the style child as a separate item", () => {
        const items = defsItemsOf(style('.cls-1{fill:red;}.cls-2, .cls-3{stroke:blue;}'));
        expect(items.map((i) => i.kind === 'class' && i.label)).toEqual(['.cls-1', '.cls-2', '.cls-3']);
    });

    it("lists a class only once when several rules name it", () => {
        const items = defsItemsOf(style('.a{fill:red}') + style('.a{stroke:blue}'));
        expect(items.length).toBe(1);
    });

    it("nests the elements of defs by their containment, using the id when there is one", () => {
        const items = defsItemsOf('<linearGradient id="grad"><stop offset="0"/></linearGradient><clipPath><rect x="0" y="0" width="5" height="5"/></clipPath>');
        expect(items.map((i) => i.kind === 'element' && i.label)).toEqual(['grad', '<clipPath>']);
        const [grad, clip] = items as Array<Extract<typeof items[number], { kind: 'element' }>>;
        expect(grad.children.map((c) => [c.tag, c.label, c.index])).toEqual([['stop', '<stop>', 1]]);
        expect(clip.index).toBe(2);
        expect(clip.children.map((c) => c.tag)).toEqual(['rect']);
    });

    it("lists classes first, then elements, and leaves the style element out of the elements", () => {
        const items = defsItemsOf('<filter id="f"/>' + style('.a{fill:red}'));
        expect(items.map((i) => i.key)).toEqual(['class:a', 'el:0']);
    });

    it("returns nothing for an empty defs", () => {
        expect(defsItemsOf('')).toEqual([]);
    });

    it("reads a class renamed to deactivated-* as an inactive class of the base name", () => {
        const items = defsItemsOf(style('.cls-1{fill:red}.deactivated-cls-2{fill:blue}'));
        expect(items.map((i) => (i.kind === 'class' ? [i.name, i.active] : null))).toEqual([['cls-1', true], ['cls-2', false]]);
    });
});

describe("defs item ids", () => {
    it("round-trips the defs id and the part for elements and classes", () => {
        expect(parseDefsItemId(defsElementId('n5', 3))).toEqual({ defsId: 'n5', part: '3' });
        expect(parseDefsItemId(defsClassId('n5', 'cls-1'))).toEqual({ defsId: 'n5', part: '.cls-1' });
    });

    it("does not read ordinary node ids or anchor keys as defs items", () => {
        expect(parseDefsItemId('n5')).toBeUndefined();
        expect(parseDefsItemId('n5|0')).toBeUndefined();
    });

    it("tells whether the element or class exists in the document", () => {
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', '<linearGradient id="g"><stop/></linearGradient>' + style('.cls-1{fill:red}'))] };
        expect(isDefsItemOf(doc, 'd/0')).toBe(true);
        expect(isDefsItemOf(doc, 'd/1')).toBe(true);
        expect(isDefsItemOf(doc, 'd/3')).toBe(false);
        expect(isDefsItemOf(doc, 'd/.cls-1')).toBe(true);
        expect(isDefsItemOf(doc, 'd/.cls-2')).toBe(false);
        expect(isDefsItemOf(doc, 'x/0')).toBe(false);
    });
});

describe("buildSourceMap for classes of defs", () => {
    it("gives each class the range of its rule, whether it is active or turned off", () => {
        const text = '<svg xmlns="http://www.w3.org/2000/svg"><defs><style>.cls-1{fill:red}\n.deactivated-cls-2{stroke:blue}</style></defs><path d="M0 0"/></svg>';
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', style('.cls-1{fill:red}\n.deactivated-cls-2{stroke:blue}')), path('p')] };
        const map = buildSourceMap(text, doc);

        const one = map.get(defsClassId('d', 'cls-1'))!;
        const two = map.get(defsClassId('d', 'cls-2'))!;
        expect(text.slice(one.start, one.end)).toBe('.cls-1{fill:red}');
        expect(text.slice(two.start, two.end)).toBe('.deactivated-cls-2{stroke:blue}');
    });
});

describe("buildSourceMap for elements inside defs", () => {
    it("gives each element of defs the range of its own markup", () => {
        const text = '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><path d="M0 0"/></svg>';
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', '<linearGradient id="g"><stop offset="0"/></linearGradient>'), path('p')] };
        const map = buildSourceMap(text, doc);

        const grad = map.get('d/0')!;
        const stop = map.get('d/1')!;
        expect(text.slice(grad.start, grad.end)).toBe('<linearGradient id="g"><stop offset="0"/></linearGradient>');
        expect(text.slice(stop.start, stop.end)).toBe('<stop offset="0"/>');
        expect(text.slice(map.get('p')!.start, map.get('p')!.end)).toBe('<path d="M0 0"/>');
    });
});

describe("setDefsClassActiveInMarkup", () => {
    it("renames the class to deactivated-* when turned off, and back when turned on", () => {
        const off = setDefsClassActiveInMarkup(style('.cls-1{fill:red}'), 'cls-1', false);
        expect(off).toBe(style('.deactivated-cls-1{fill:red}'));
        expect(setDefsClassActiveInMarkup(off, 'cls-1', true)).toBe(style('.cls-1{fill:red}'));
    });

    it("renames only the named selector of a selector list", () => {
        expect(setDefsClassActiveInMarkup(style('.cls-2, .cls-3{stroke:blue}'), 'cls-2', false))
            .toBe(style('.deactivated-cls-2, .cls-3{stroke:blue}'));
    });

    it("does not touch a longer class name that starts with the same text", () => {
        expect(setDefsClassActiveInMarkup(style('.cls-10{fill:red}'), 'cls-1', false)).toBe(style('.cls-10{fill:red}'));
    });

    it("does not change declarations, and is a no-op when already in that state", () => {
        const text = style('.cls-1{fill:url(#cls-1)}');
        expect(setDefsClassActiveInMarkup(text, 'cls-1', true)).toBe(text);
        expect(setDefsClassActiveInMarkup(setDefsClassActiveInMarkup(text, 'cls-1', false), 'cls-1', false))
            .toBe(style('.deactivated-cls-1{fill:url(#cls-1)}'));
    });
});

describe("defsIdsForClassesOf", () => {
    const doc = (children: SvgNode[]): SvgDoc => ({ viewBox: null, rootAttrs: {}, children });

    it("finds the defs that define a class used by a selected element", () => {
        const d = doc([defs('d1', style('.a{fill:red}')), defs('d2', style('.b{fill:blue}')), path('p1', 'b'), path('p2')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d2']);
        expect(defsIdsForClassesOf(d, ['p2'])).toEqual([]);
    });

    it("counts a class that is turned off, because the element still uses it", () => {
        const d = doc([defs('d1', style('.deactivated-a{fill:red}')), path('p1', 'a')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d1']);
    });
});
