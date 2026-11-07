import { describe, expect, it } from "vitest";
import { type SvgNode, defsItemsFromChildren } from "../index";

const style = (inner: string): SvgNode => ({ id: 's', kind: 'passthrough', tag: 'style', inner, attrs: {} });
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
});
