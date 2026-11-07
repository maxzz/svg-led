import { describe, expect, it } from "vitest";
import { type SvgDoc, type SvgNode, defsIdsForClassesOf, defsItemsFromChildren, setDefsClassActiveInMarkup } from "../index";

const style = (inner: string): SvgNode => ({ id: 's', kind: 'passthrough', tag: 'style', inner, attrs: {} });
const defs = (id: string, inner: string): SvgNode => ({ id, kind: 'passthrough', tag: 'defs', inner: `<style>${inner}</style>`, attrs: {} });
const path = (id: string, cls?: string): SvgNode => ({ id, kind: 'path', d: 'M0 0', attrs: cls ? { class: cls } : {} });
const grad = (id: string): SvgNode => ({ id: 'g', kind: 'passthrough', tag: 'linearGradient', inner: '', attrs: { id } });
const clip = (): SvgNode => ({ id: 'c', kind: 'passthrough', tag: 'clipPath', inner: '', attrs: {} });
const filter = (id: string): SvgNode => ({ id: 'f', kind: 'passthrough', tag: 'filter', inner: '', attrs: { id } });

describe("defsItemsFromChildren", () => {
    it("lists each class of the style child as a separate item", () => {
        const items = defsItemsFromChildren([style('.cls-1{fill:red;}.cls-2, .cls-3{stroke:blue;}')]);
        expect(items.map((i) => i.label)).toEqual(['.cls-1', '.cls-2', '.cls-3']);
        expect(items.every((i) => i.kind === 'class')).toBe(true);
    });

    it("lists a class only once when several rules name it", () => {
        const items = defsItemsFromChildren([style('.a{fill:red}'), style('.a{stroke:blue}')]);
        expect(items.map((i) => i.label)).toEqual(['.a']);
    });

    it("lists other children of defs as elements, using the id when there is one", () => {
        const items = defsItemsFromChildren([grad('grad'), clip()]);
        expect(items.map((i) => i.label)).toEqual(['grad', '<clipPath>']);
        expect(items.map((i) => i.tag)).toEqual(['linearGradient', 'clipPath']);
    });

    it("lists classes first, then elements, without the style element itself", () => {
        const items = defsItemsFromChildren([filter('f'), style('.a{fill:red}')]);
        expect(items.map((i) => i.key)).toEqual(['class:a', 'el:0']);
    });

    it("returns nothing for an empty defs", () => {
        expect(defsItemsFromChildren([])).toEqual([]);
    });

    it("reads a class renamed to deactivated-* as an inactive class of the base name", () => {
        const items = defsItemsFromChildren([style('.cls-1{fill:red}.deactivated-cls-2{fill:blue}')]);
        expect(items.map((i) => [i.name, i.active])).toEqual([['cls-1', true], ['cls-2', false]]);
    });
});

describe("setDefsClassActiveInMarkup", () => {
    const css = (s: string) => `<style>${s}</style>`;

    it("renames the class to deactivated-* when turned off, and back when turned on", () => {
        const off = setDefsClassActiveInMarkup(css('.cls-1{fill:red}'), 'cls-1', false);
        expect(off).toBe(css('.deactivated-cls-1{fill:red}'));
        expect(setDefsClassActiveInMarkup(off, 'cls-1', true)).toBe(css('.cls-1{fill:red}'));
    });

    it("renames only the named selector of a selector list", () => {
        expect(setDefsClassActiveInMarkup(css('.cls-2, .cls-3{stroke:blue}'), 'cls-2', false))
            .toBe(css('.deactivated-cls-2, .cls-3{stroke:blue}'));
    });

    it("does not touch a longer class name that starts with the same text", () => {
        expect(setDefsClassActiveInMarkup(css('.cls-10{fill:red}'), 'cls-1', false)).toBe(css('.cls-10{fill:red}'));
    });

    it("does not change declarations, and is a no-op when already in that state", () => {
        const text = css('.cls-1{fill:url(#cls-1)}');
        expect(setDefsClassActiveInMarkup(text, 'cls-1', true)).toBe(text);
        expect(setDefsClassActiveInMarkup(setDefsClassActiveInMarkup(text, 'cls-1', false), 'cls-1', false))
            .toBe(css('.deactivated-cls-1{fill:url(#cls-1)}'));
    });
});

describe("defsIdsForClassesOf", () => {
    const doc = (children: SvgNode[]): SvgDoc => ({ viewBox: null, rootAttrs: {}, children });

    it("finds the defs that define a class used by a selected element", () => {
        const d = doc([defs('d1', '.a{fill:red}'), defs('d2', '.b{fill:blue}'), path('p1', 'b'), path('p2')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d2']);
        expect(defsIdsForClassesOf(d, ['p2'])).toEqual([]);
    });

    it("counts a class that is turned off, because the element still uses it", () => {
        const d = doc([defs('d1', '.deactivated-a{fill:red}'), path('p1', 'a')]);
        expect(defsIdsForClassesOf(d, ['p1'])).toEqual(['d1']);
    });
});
