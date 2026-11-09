import { describe, expect, it } from "vitest";
import { activeClassDecls, applyClassDecls, deleteDefsClassMarkup, deleteDefsElementMarkup, removeClassToken } from "../index";

describe("deleteDefsElementMarkup", () => {
    it("removes an element with its children and the white space before it", () => {
        const inner = '\n  <style>.a{}</style>\n  <linearGradient id="g"><stop/></linearGradient>\n';
        expect(deleteDefsElementMarkup(inner, 1)).toBe('\n  <style>.a{}</style>\n');
    });

    it("removes a nested element only", () => {
        expect(deleteDefsElementMarkup('<linearGradient id="g"><stop/><stop/></linearGradient>', 2)).toBe('<linearGradient id="g"><stop/></linearGradient>');
    });

    it("leaves the markup when there is no such element", () => {
        expect(deleteDefsElementMarkup('<style/>', 3)).toBe('<style/>');
    });
});

describe("deleteDefsClassMarkup", () => {
    it("removes the rules of a class and keeps the other classes of a shared rule", () => {
        const inner = '<style>.a{fill:red}\n.a, .b{stroke:blue}\n.c{}</style>';
        expect(deleteDefsClassMarkup(inner, 0, 'a')).toBe('<style>\n.b{stroke:blue}\n.c{}</style>');
    });
});

describe("activeClassDecls", () => {
    it("skips commented-out declarations and deactivated selectors", () => {
        const inner = '<style>.a{fill:red;/*svg-led:off stroke:blue;*/}\n.deactivated-a{opacity:.5}\n.a, .b{stroke-width:2}</style>';
        expect(activeClassDecls(inner, 0, 'a')).toEqual([{ prop: 'fill', value: 'red' }, { prop: 'stroke-width', value: '2' }]);
    });
});

describe("removeClassToken", () => {
    it("removes only the named class and keeps the others", () => {
        const attrs: Record<string, string> = { class: 'a b c' };
        removeClassToken(attrs, 'b');
        expect(attrs).toEqual({ class: 'a c' });
    });

    it("removes the class attribute when no other class is left", () => {
        const attrs: Record<string, string> = { class: 'a', fill: 'red' };
        removeClassToken(attrs, 'a');
        expect(attrs).toEqual({ fill: 'red' });
    });

    it("does not match a class whose name only starts with the given one", () => {
        const attrs: Record<string, string> = { class: 'ab a-b' };
        removeClassToken(attrs, 'a');
        expect(attrs).toEqual({ class: 'ab a-b' });
    });
});

describe("applyClassDecls", () => {
    it("writes presentation properties as attributes and keeps the class", () => {
        const attrs: Record<string, string> = { class: 'a b', fill: 'green' };
        applyClassDecls(attrs, [{ prop: 'fill', value: 'red' }, { prop: 'stroke', value: 'blue' }]);
        expect(attrs).toEqual({ class: 'a b', fill: 'red', stroke: 'blue' });
    });

    it("can be applied again after the rule changed", () => {
        const attrs: Record<string, string> = { class: 'a' };
        applyClassDecls(attrs, [{ prop: 'fill', value: 'red' }]);
        applyClassDecls(attrs, [{ prop: 'fill', value: 'blue' }]);
        expect(attrs).toEqual({ class: 'a', fill: 'blue' });
    });

    it("keeps inline style and puts other properties into style", () => {
        const attrs: Record<string, string> = { class: 'a', style: 'fill:green' };
        applyClassDecls(attrs, [{ prop: 'fill', value: 'red' }, { prop: 'mix-blend-mode', value: 'multiply' }]);
        expect(attrs).toEqual({ class: 'a', style: 'fill:green;mix-blend-mode:multiply' });
    });

    it("lets an !important declaration override inline style", () => {
        const attrs: Record<string, string> = { class: 'a', style: 'fill:green' };
        applyClassDecls(attrs, [{ prop: 'fill', value: 'red !important' }]);
        expect(attrs).toEqual({ class: 'a', style: 'fill:red' });
    });
});
