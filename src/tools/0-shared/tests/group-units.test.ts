import { describe, expect, it } from "vitest";
import { type SvgDoc } from "@/svg-core";
import { selectedGroupOnPath, selectionUnitId } from "../4-group-units";

// <g A> [ <rect a1/>, <g B> [ <rect b1/> ] ]  <rect c/>
const doc = {
    children: [
        {
            kind: 'g', id: 'A', attrs: {}, children: [
                { kind: 'rect', id: 'a1', attrs: {} },
                { kind: 'g', id: 'B', attrs: {}, children: [{ kind: 'rect', id: 'b1', attrs: {} }] },
            ],
        },
        { kind: 'rect', id: 'c', attrs: {} },
    ],
} as unknown as SvgDoc;

describe("selectionUnitId", () => {
    it("selects the outermost group outside group editing", () => {
        expect(selectionUnitId(doc, 'b1', null)).toBe('A');
        expect(selectionUnitId(doc, 'a1', null)).toBe('A');
    });

    it("selects the element itself when it is not in a group", () => {
        expect(selectionUnitId(doc, 'c', null)).toBe('c');
    });

    it("selects the child of the edited group on the path", () => {
        expect(selectionUnitId(doc, 'b1', 'A')).toBe('B');
        expect(selectionUnitId(doc, 'a1', 'A')).toBe('a1');
    });

    it("ignores an edited group that is not on the path", () => {
        expect(selectionUnitId(doc, 'c', 'A')).toBe('c');
    });
});

describe("selectedGroupOnPath", () => {
    it("returns the innermost selected group around the element", () => {
        expect(selectedGroupOnPath(doc, 'b1', ['A', 'B'])).toBe('B');
        expect(selectedGroupOnPath(doc, 'b1', ['A'])).toBe('A');
    });

    it("returns undefined when no group around the element is selected", () => {
        expect(selectedGroupOnPath(doc, 'b1', ['a1'])).toBeUndefined();
        expect(selectedGroupOnPath(doc, 'c', ['A'])).toBeUndefined();
    });
});
