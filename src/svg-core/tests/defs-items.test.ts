import { describe, expect, it } from "vitest";
import { type DefsClassItem, type DefsElementItem, type DefsItem, type SvgDoc, type SvgNode, buildSourceMap, defsClassId, defsElementId, defsIdsForClassesOf, defsItemsOf, isDefsItemOf, parseDefsItemId, setDefsClassActiveInMarkup, setDefsDeclActiveInMarkup, setDefsElementActiveInMarkup } from "../index";

const style = (css: string) => `<style>${css}</style>`;
const defs = (id: string, inner: string, tag = 'defs'): SvgNode => ({ id, kind: 'passthrough', tag, inner, attrs: {} });
const path = (id: string, cls?: string): SvgNode => ({ id, kind: 'path', d: 'M0 0', attrs: cls ? { class: cls } : {} });
const el = (items: DefsItem[], part: string) => items.find((i): i is DefsElementItem => i.kind === 'element' && i.part === part)!;
const cls = (item: DefsItem | undefined) => item as DefsClassItem;

describe("defsItemsOf", () => {
    it("shows a style element as one item, with its classes as children", () => {
        const [s] = defsItemsOf(style('.cls-1{fill:red;}.cls-2, .cls-3{stroke:blue;}'));
        expect(s.kind === 'element' && [s.tag, s.off]).toEqual(['style', false]);
        expect(s.kind === 'element' && s.children.map((c) => c.kind === 'class' && c.label)).toEqual(['.cls-1', '.cls-2', '.cls-3']);
    });

    it("nests the elements of defs by containment, labelled by id or tag", () => {
        const items = defsItemsOf('<linearGradient id="grad"><stop offset="0"/></linearGradient><clipPath><rect x="0"/></clipPath>');
        expect(items.map((i) => i.kind === 'element' && i.label)).toEqual(['grad', '<clipPath>']);
        expect(el(items, '0').children.map((c) => c.kind === 'element' && [c.part, c.tag])).toEqual([['1', 'stop']]);
        expect(el(items, '2').children.map((c) => c.kind === 'element' && c.tag)).toEqual(['rect']);
    });

    it("shows a deactivated element without its prefix, and marks it off", () => {
        const items = defsItemsOf('<deactivated-linearGradient id="g"><stop/></deactivated-linearGradient>');
        expect(el(items, '0')).toMatchObject({ label: 'g', tag: 'linearGradient', off: true });
        expect(el(items, '0').children.map((c) => c.kind === 'element' && c.off)).toEqual([false]);
    });

    it("shows a deactivated style without its prefix, with its classes marked off", () => {
        const [s] = defsItemsOf('<deactivated-style>.deactivated-cls-1{fill:red}</deactivated-style>');
        expect(s.kind === 'element' && [s.tag, s.off]).toEqual(['style', true]);
        expect(s.kind === 'element' && cls(s.children[0])).toMatchObject({ label: '.cls-1', off: true });
    });

    it("lists the declarations of a class as a table, with the commented ones off", () => {
        const [s] = defsItemsOf(style('.cls-1{fill:red;/*svg-led:off stroke:#000;*/}'));
        const c = cls(s.kind === 'element' ? s.children[0] : undefined);
        expect(c.decls.map((d) => [d.prop, d.value, d.off, d.toggleable])).toEqual([['fill', 'red', false, true], ['stroke', '#000', true, true]]);
    });

    it("lists the declarations over all rules of a class, in order", () => {
        const [s] = defsItemsOf(style('.cls-1{fill:red}.cls-1{stroke:blue}'));
        const c = cls(s.kind === 'element' ? s.children[0] : undefined);
        expect(c.decls.map((d) => d.prop)).toEqual(['fill', 'stroke']);
    });

    it("gives classes of two style elements separate items", () => {
        const items = defsItemsOf(style('.cls-1{fill:red}') + style('.cls-1{stroke:blue}'));
        expect(items.map((i) => i.kind === 'element' && i.children.map((c) => c.kind === 'class' && c.part))).toEqual([['0.cls-1'], ['1.cls-1']]);
    });

    it("returns nothing for an empty defs", () => {
        expect(defsItemsOf('')).toEqual([]);
    });
});

describe("setDefsElementActiveInMarkup", () => {
    const grad = '<linearGradient id="g"><stop/></linearGradient>';

    it("renames the element and its end tag, and renames it back", () => {
        const off = setDefsElementActiveInMarkup(grad, 0, false);
        expect(off).toBe('<deactivated-linearGradient id="g"><stop/></deactivated-linearGradient>');
        expect(setDefsElementActiveInMarkup(off, 0, true)).toBe(grad);
    });

    it("renames a self-closing element", () => {
        expect(setDefsElementActiveInMarkup('<stop/>', 0, false)).toBe('<deactivated-stop/>');
    });

    it("renames a nested element by its index", () => {
        expect(setDefsElementActiveInMarkup(grad, 1, false)).toBe('<linearGradient id="g"><deactivated-stop/></linearGradient>');
    });

    it("renames a style element too", () => {
        expect(setDefsElementActiveInMarkup(style('.a{fill:red}'), 0, false)).toBe('<deactivated-style>.a{fill:red}</deactivated-style>');
    });

    it("does nothing when the element already has the state asked for", () => {
        expect(setDefsElementActiveInMarkup('<deactivated-stop/>', 0, false)).toBe('<deactivated-stop/>');
    });
});

describe("setDefsClassActiveInMarkup", () => {
    it("renames the selector, and renames it back to the same text", () => {
        const text = style('.cls-1{ fill:red;\n  stroke:#000 }');
        const off = setDefsClassActiveInMarkup(text, 0, 'cls-1', false);
        expect(off).toBe(style('.deactivated-cls-1{ fill:red;\n  stroke:#000 }'));
        expect(setDefsClassActiveInMarkup(off, 0, 'cls-1', true)).toBe(text);
    });

    it("renames only the class of the style element asked for, when two styles share the name", () => {
        const text = style('.cls-1{fill:red}') + style('.cls-1{stroke:blue}');
        expect(setDefsClassActiveInMarkup(text, 1, 'cls-1', false)).toBe(style('.cls-1{fill:red}') + style('.deactivated-cls-1{stroke:blue}'));
    });

    it("renames only the selector that names the class in a shared rule", () => {
        expect(setDefsClassActiveInMarkup(style('.cls-2, .cls-3{stroke:blue}'), 0, 'cls-2', false)).toBe(style('.deactivated-cls-2, .cls-3{stroke:blue}'));
    });

    it("does not touch a longer class name that starts with the same text", () => {
        expect(setDefsClassActiveInMarkup(style('.cls-10{fill:red}'), 0, 'cls-1', false)).toBe(style('.cls-10{fill:red}'));
    });

    it("leaves the markup alone when the class is already in the state asked for", () => {
        expect(setDefsClassActiveInMarkup(style('.deactivated-cls-1{fill:red}'), 0, 'cls-1', false)).toBe(style('.deactivated-cls-1{fill:red}'));
    });
});

describe("setDefsDeclActiveInMarkup", () => {
    it("comments out one declaration with the svg-led:off marker, and restores it", () => {
        const text = style('.cls-1{fill:red;stroke:#000}');
        const off = setDefsDeclActiveInMarkup(text, 0, 'cls-1', 0, false);
        expect(off).toBe(style('.cls-1{/*svg-led:off fill:red;*/stroke:#000}'));
        expect(setDefsDeclActiveInMarkup(off, 0, 'cls-1', 0, true)).toBe(text);
    });

    it("finds a declaration in a later rule of the same class", () => {
        expect(setDefsDeclActiveInMarkup(style('.cls-1{fill:red}.cls-1{stroke:blue}'), 0, 'cls-1', 1, false))
            .toBe(style('.cls-1{fill:red}.cls-1{/*svg-led:off stroke:blue*/}'));
    });

    it("leaves a declaration alone when its text holds the comment end", () => {
        const text = style('.cls-1{fill:url(a*/b)}');
        expect(setDefsDeclActiveInMarkup(text, 0, 'cls-1', 0, false)).toBe(text);
    });
});

describe("defs item ids", () => {
    it("round-trips the defs id and the part for elements and classes", () => {
        expect(parseDefsItemId(defsElementId('n5', 3))).toEqual({ defsId: 'n5', part: '3' });
        expect(parseDefsItemId(defsClassId('n5', 2, 'cls-1'))).toEqual({ defsId: 'n5', part: '2.cls-1' });
    });

    it("does not read ordinary node ids as defs items", () => {
        expect(parseDefsItemId('n5')).toBeUndefined();
        expect(parseDefsItemId('n5|0')).toBeUndefined();
    });

    it("tells whether an element or a class of a defs still exists", () => {
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', '<linearGradient id="g"><stop/></linearGradient>' + style('.cls-1{fill:red}'))] };
        expect(isDefsItemOf(doc, 'd/0')).toBe(true);
        expect(isDefsItemOf(doc, 'd/2')).toBe(true);
        expect(isDefsItemOf(doc, 'd/3')).toBe(false);
        expect(isDefsItemOf(doc, 'd/2.cls-1')).toBe(true);
        expect(isDefsItemOf(doc, 'd/2.cls-2')).toBe(false);
        expect(isDefsItemOf(doc, 'd/0.cls-1')).toBe(false);
        expect(isDefsItemOf(doc, 'x/0')).toBe(false);
    });
});

describe("buildSourceMap for items of defs", () => {
    it("gives elements and classes their ranges in the text, deactivated ones included", () => {
        const inner = '<deactivated-linearGradient id="g"><stop/></deactivated-linearGradient>' + style('.cls-1{fill:red}\n.deactivated-cls-2{stroke:blue}');
        const text = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${inner}</defs><path d="M0 0"/></svg>`;
        const doc: SvgDoc = { viewBox: null, rootAttrs: {}, children: [defs('d', inner), path('p')] };
        const map = buildSourceMap(text, doc);
        const slice = (id: string) => text.slice(map.get(id)!.start, map.get(id)!.end);

        expect(slice('d/0')).toBe('<deactivated-linearGradient id="g"><stop/></deactivated-linearGradient>');
        expect(slice('d/1')).toBe('<stop/>');
        expect(slice(defsClassId('d', 2, 'cls-1'))).toBe('.cls-1{fill:red}');
        expect(slice(defsClassId('d', 2, 'cls-2'))).toBe('.deactivated-cls-2{stroke:blue}');
        expect(slice('p')).toBe('<path d="M0 0"/>');
    });
});

describe("defsIdsForClassesOf", () => {
    const doc = (children: SvgNode[]): SvgDoc => ({ viewBox: null, rootAttrs: {}, children });

    it("finds the defs that define a class used by a selected element", () => {
        const d = doc([defs('d1', style('.a{fill:red}')), defs('d2', style('.b{fill:blue}')), path('p1', 'b'), path('p2')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d2']);
        expect(defsIdsForClassesOf(d, ['p2'])).toEqual([]);
    });

    it("counts a deactivated class and a deactivated defs, because the element still uses the class", () => {
        const d = doc([defs('d1', style('.deactivated-a{fill:red}'), 'deactivated-defs'), path('p1', 'a')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d1']);
    });
});
