import { describe, expect, it } from "vitest";
import { type DefsElementItem, type DefsItem, type SvgDoc, type SvgNode, buildSourceMap, defsClassId, defsIdsForClassesOf, defsItemsOf, isDefsItemOf, parseDefsItemId, setDefsClassActiveInMarkup, setDefsElementActiveInMarkup, defsElementId } from "../index";

const style = (css: string) => `<style>${css}</style>`;
const defs = (id: string, inner: string): SvgNode => ({ id, kind: 'passthrough', tag: 'defs', inner, attrs: {} });
const path = (id: string, cls?: string): SvgNode => ({ id, kind: 'path', d: 'M0 0', attrs: cls ? { class: cls } : {} });
const element = (items: DefsItem[], part: string) => items.find((i): i is DefsElementItem => i.kind === 'element' && i.part === part);

describe("defsItemsOf", () => {
    it("shows a style element as one item with its classes as children", () => {
        const [s] = defsItemsOf(style('.cls-1{fill:red;}.cls-2, .cls-3{stroke:blue;}'));
        expect(s.kind).toBe('element');
        if (s.kind !== 'element') return;
        expect(s.tag).toBe('style');
        expect(s.toggleable).toBe(false);
        expect(s.children.map((c) => c.kind === 'class' && c.label)).toEqual(['.cls-1', '.cls-2', '.cls-3']);
    });

    it("nests the elements of defs by their containment, using the id when there is one", () => {
        const items = defsItemsOf('<linearGradient id="grad"><stop offset="0"/></linearGradient><clipPath><rect x="0" y="0" width="5" height="5"/></clipPath>');
        expect(items.map((i) => i.kind === 'element' && i.label)).toEqual(['grad', '<clipPath>']);
        expect(element(items, '0')!.children.map((c) => c.kind === 'element' && [c.tag, c.part])).toEqual([['stop', '1']]);
        expect(element(items, '2')!.children.map((c) => c.kind === 'element' && c.tag)).toEqual(['rect']);
    });

    it("keeps the style element among the elements, in document order", () => {
        const items = defsItemsOf('<filter id="f"/>' + style('.a{fill:red}'));
        expect(items.map((i) => i.key)).toEqual(['el:0', 'el:1']);
    });

    it("lists an element commented out as a deactivated item, with its contents under it", () => {
        const items = defsItemsOf('<!--svg-led:off <linearGradient id="g"><stop/></linearGradient>-->');
        const block = element(items, 'o0')!;
        expect(block.off).toBe(true);
        expect(block.toggleable).toBe(true);
        expect(block.label).toBe('g');
        expect(block.children.map((c) => c.kind === 'element' && [c.part, c.off, c.toggleable])).toEqual([['o0.1', true, false]]);
    });

    it("reads a deactivated class as inactive, and keeps its declarations for reactivation", () => {
        const [s] = defsItemsOf(style('.cls-1{/*svg-led:off fill:red*/}.cls-2{fill:blue}'));
        expect(s.kind === 'element' && s.children.map((c) => c.kind === 'class' && [c.name, c.active])).toEqual([['cls-1', false], ['cls-2', true]]);
    });

    it("returns nothing for an empty defs", () => {
        expect(defsItemsOf('')).toEqual([]);
    });
});

describe("setDefsClassActiveInMarkup", () => {
    it("rewrites the rule so the class hides its elements, keeping the declarations in a comment", () => {
        const off = setDefsClassActiveInMarkup(style('.cls-1{fill:red}'), 'cls-1', false);
        expect(off).toBe(style('.cls-1{/*svg-led:off fill:red*/}'));
    });

    it("does not add display to the rule, so other rules with the same class name are not affected", () => {
        const text = style('.cls-1{fill:red}') + style('.cls-1{stroke:blue}');
        const off = setDefsClassActiveInMarkup(text, 'cls-1', false);
        expect(off).not.toContain('display');
        expect(off).toBe(style('.cls-1{/*svg-led:off fill:red*/}') + style('.cls-1{stroke:blue}'));
    });

    it("restores the rule exactly when turned on again", () => {
        const text = style('.cls-1{ fill:red;\n  stroke:#000 }');
        const off = setDefsClassActiveInMarkup(text, 'cls-1', false);
        expect(setDefsClassActiveInMarkup(off, 'cls-1', true)).toBe(text);
    });

    it("splits a shared rule so the other selectors keep their declarations", () => {
        expect(setDefsClassActiveInMarkup(style('.cls-2, .cls-3{stroke:blue}'), 'cls-2', false))
            .toBe(style('.cls-3{stroke:blue}.cls-2{/*svg-led:off stroke:blue*/}'));
    });

    it("does not touch a longer class name that starts with the same text", () => {
        expect(setDefsClassActiveInMarkup(style('.cls-10{fill:red}'), 'cls-1', false)).toBe(style('.cls-10{fill:red}'));
    });

    it("leaves the rule alone when its declarations contain the comment end", () => {
        const text = style('.cls-1{fill:url(a*/b)}');
        expect(setDefsClassActiveInMarkup(text, 'cls-1', false)).toBe(text);
    });
});

describe("setDefsElementActiveInMarkup", () => {
    const grad = '<linearGradient id="g"><stop/></linearGradient>';

    it("wraps an element in a comment, with its contents, and unwraps it again", () => {
        const off = setDefsElementActiveInMarkup(grad, '0', false);
        expect(off).toBe(`<!--svg-led:off ${grad}-->`);
        expect(setDefsElementActiveInMarkup(off, 'o0', true)).toBe(grad);
    });

    it("does not wrap an element whose markup contains a double dash", () => {
        const text = '<path d="M1--2"/>';
        expect(setDefsElementActiveInMarkup(text, '0', false)).toBe(text);
    });

    it("does not wrap a style element", () => {
        const text = style('.a{fill:red}');
        expect(setDefsElementActiveInMarkup(text, '0', false)).toBe(text);
    });
});

describe("defs item ids and their validity", () => {
    it("round-trips the defs id and the part for elements and classes", () => {
        expect(parseDefsItemId(defsElementId('n5', 3))).toEqual({ defsId: 'n5', part: '3' });
        expect(parseDefsItemId(defsClassId('n5', 'cls-1'))).toEqual({ defsId: 'n5', part: '.cls-1' });
    });

    it("does not read ordinary node ids or anchor keys as defs items", () => {
        expect(parseDefsItemId('n5')).toBeUndefined();
        expect(parseDefsItemId('n5|0')).toBeUndefined();
    });

    it("tells whether a live element, a deactivated element, or a class exists", () => {
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', '<linearGradient id="g"><stop/></linearGradient>' + style('.cls-1{fill:red}'))] };
        expect(isDefsItemOf(doc, 'd/0')).toBe(true);
        expect(isDefsItemOf(doc, 'd/1')).toBe(true);
        expect(isDefsItemOf(doc, 'd/3')).toBe(false);
        expect(isDefsItemOf(doc, 'd/.cls-1')).toBe(true);
        expect(isDefsItemOf(doc, 'd/.cls-2')).toBe(false);
        expect(isDefsItemOf(doc, 'd/o0')).toBe(false);
        expect(isDefsItemOf(doc, 'x/0')).toBe(false);
    });
});

describe("buildSourceMap for items of defs", () => {
    it("gives a deactivated element and its contents their ranges in the text", () => {
        const inner = '<!--svg-led:off <linearGradient id="g"><stop/></linearGradient>-->';
        const text = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${inner}</defs><path d="M0 0"/></svg>`;
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', inner), path('p')] };
        const map = buildSourceMap(text, doc);

        const block = map.get('d/o0')!;
        const stop = map.get('d/o0.1')!;
        expect(text.slice(block.start, block.end)).toBe(inner);
        expect(text.slice(stop.start, stop.end)).toBe('<stop/>');
        expect(text.slice(map.get('p')!.start, map.get('p')!.end)).toBe('<path d="M0 0"/>');
    });

    it("gives each class the range of its rule, whether it is active or deactivated", () => {
        const css = '.cls-1{fill:red}\n.cls-2{/*svg-led:off stroke:blue*/}';
        const text = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${style(css)}</defs><path d="M0 0"/></svg>`;
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', style(css)), path('p')] };
        const map = buildSourceMap(text, doc);

        const one = map.get(defsClassId('d', 'cls-1'))!;
        const two = map.get(defsClassId('d', 'cls-2'))!;
        expect(text.slice(one.start, one.end)).toBe('.cls-1{fill:red}');
        expect(text.slice(two.start, two.end)).toBe('.cls-2{/*svg-led:off stroke:blue*/}');
    });
});

describe("defsIdsForClassesOf", () => {
    const doc = (children: SvgNode[]): SvgDoc => ({ viewBox: null, rootAttrs: {}, children });

    it("finds the defs that define a class used by a selected element", () => {
        const d = doc([defs('d1', style('.a{fill:red}')), defs('d2', style('.b{fill:blue}')), path('p1', 'b'), path('p2')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d2']);
        expect(defsIdsForClassesOf(d, ['p2'])).toEqual([]);
    });

    it("counts a class that is deactivated, because the element still uses it", () => {
        const d = doc([defs('d1', style('.a{/*svg-led:off fill:red*/}')), path('p1', 'a')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d1']);
    });
});