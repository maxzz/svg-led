import { describe, expect, it } from "vitest";
import { defsItemsOf, moveDefsClassMarkup, moveDefsElementMarkup } from "../index";

describe("moveDefsElementMarkup", () => {
    it("moves a style above another element of the same defs", () => {
        const inner = '<style id="s">.a{fill:red}</style><linearGradient id="g"/>';
        const r = moveDefsElementMarkup(inner, 1, undefined, { ordinal: 0, place: 'above' });
        expect(r?.src).toBe('<linearGradient id="g"/><style id="s">.a{fill:red}</style>');
        expect(r?.dst).toBe(r?.src);
    });

    it("moves a style to the end of another defs", () => {
        const r = moveDefsElementMarkup('<style>.a{fill:red}</style>', 0, '<linearGradient id="g"/>', { place: 'end' });
        expect(r).toEqual({ src: '', dst: '<linearGradient id="g"/><style>.a{fill:red}</style>' });
    });

    it("moves a style below an element of another defs", () => {
        const r = moveDefsElementMarkup('<style>.a{}</style><filter id="f"/>', 0, '<clipPath id="c"/>', { ordinal: 0, place: 'below' });
        expect(r).toEqual({ src: '<filter id="f"/>', dst: '<clipPath id="c"/><style>.a{}</style>' });
    });

    it("keeps a nested element with its top-level element", () => {
        const inner = '<linearGradient id="g"><stop/></linearGradient><filter id="f"/>';
        const r = moveDefsElementMarkup(inner, 0, undefined, { place: 'end' });
        expect(r?.src).toBe('<filter id="f"/><linearGradient id="g"><stop/></linearGradient>');
    });

    it("does nothing when the element is dropped next to itself", () => {
        const inner = '<style>.a{}</style><filter id="f"/>';
        expect(moveDefsElementMarkup(inner, 0, undefined, { ordinal: 0, place: 'above' })).toBeUndefined();
        expect(moveDefsElementMarkup(inner, 0, undefined, { ordinal: 1, place: 'above' })).toBeUndefined();
        expect(moveDefsElementMarkup(inner, 1, undefined, { ordinal: 0, place: 'below' })).toBeUndefined();
    });
});

describe("moveDefsClassMarkup", () => {
    it("reorders a class below another class of the same style", () => {
        const inner = '<style>.a{fill:red}\n.b{fill:blue}</style>';
        const r = moveDefsClassMarkup(inner, { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 0, name: 'b', place: 'below' });
        expect(r?.src).toBe('<style>\n.b{fill:blue}\n.a{fill:red}</style>');
    });

    it("moves a class to the end of another style, in another defs", () => {
        const r = moveDefsClassMarkup('<style>.a{x:1}</style>', { styleIndex: 0, name: 'a' }, '<style>.c{y:2}</style>', { styleIndex: 0, place: 'end' });
        expect(r).toEqual({ src: '<style></style>', dst: '<style>.c{y:2}\n.a{x:1}</style>' });
    });

    it("moves a class to a style of the same defs", () => {
        const inner = '<style>.a{x:1}</style><style>.c{y:2}</style>';
        const r = moveDefsClassMarkup(inner, { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 1, name: 'c', place: 'above' });
        expect(r?.src).toBe('<style></style><style>.a{x:1}\n.c{y:2}</style>');
    });

    it("keeps the other classes of a shared rule and gives the moved one its own rule", () => {
        const r = moveDefsClassMarkup('<style>.a, .b{fill:red}</style><style>.c{}</style>', { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 1, name: 'c', place: 'above' });
        expect(r?.src).toBe('<style>.b{fill:red}</style><style>.a{fill:red}\n.c{}</style>');
    });

    it("moves a deactivated class with its prefix and its commented declarations", () => {
        const r = moveDefsClassMarkup('<style>.deactivated-a{/*svg-led:off fill:red;*/}</style>', { styleIndex: 0, name: 'a' }, '<style></style>', { styleIndex: 0, place: 'end' });
        expect(r?.dst).toBe('<style>\n.deactivated-a{/*svg-led:off fill:red;*/}</style>');
    });

    it("does nothing when the class is dropped next to itself", () => {
        const inner = '<style>.a{}\n.b{}</style>';
        expect(moveDefsClassMarkup(inner, { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 0, name: 'a', place: 'above' })).toBeUndefined();
        // a is above b already: above b, and below a, leave the order as it is
        expect(moveDefsClassMarkup(inner, { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 0, name: 'b', place: 'above' })).toBeUndefined();
        expect(moveDefsClassMarkup(inner, { styleIndex: 0, name: 'b' }, undefined, { styleIndex: 0, name: 'a', place: 'below' })).toBeUndefined();
        // real changes: b above a, and a below b
        expect(moveDefsClassMarkup(inner, { styleIndex: 0, name: 'b' }, undefined, { styleIndex: 0, name: 'a', place: 'above' })?.src).toBe('<style>.b{}\n.a{}</style>');
        expect(moveDefsClassMarkup(inner, { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 0, name: 'b', place: 'below' })?.src).toBe('<style>\n.b{}\n.a{}</style>');
    });

    it("keeps the class items of the tree consistent after a move", () => {
        const moved = moveDefsClassMarkup('<style>.a{}\n.b{}</style>', { styleIndex: 0, name: 'a' }, undefined, { styleIndex: 0, name: 'b', place: 'below' });
        const names = defsItemsOf(moved!.src)[0].kind === 'element' ? defsItemsOf(moved!.src)[0].children.map((c) => c.kind === 'class' ? c.name : '') : [];
        expect(names).toEqual(['b', 'a']);
    });
});
