import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
    const storage = new Map<string, string>();
    Object.assign(globalThis, {
        localStorage: {
            getItem: (k: string) => storage.get(k) ?? null,
            setItem: (k: string, v: string) => storage.set(k, v),
            removeItem: (k: string) => storage.delete(k),
        },
        window: { document: { documentElement: { classList: { add() { }, remove() { } } } }, matchMedia: () => ({ matches: false }) },
    });
});

import { type Attrs, type GroupNode, type PathNode, type RectNode, type SvgNode, localBBox, rotateMatrix } from "@/svg-core";
import { docState } from "@/store/3-document";
import { commitMatrixText, formatMatrix, parseMatrixInput, selectionMatrixView } from "./0-matrix-text";
import { bakeNodeMatrix, canBakeMatrix, stripNodeMatrix } from "./1-bake-matrix";
import { applySelectionMatrices, removeSelectionMatrices, writeSelectionMatrix } from "./2-matrix-commands";

function rect(id: string, x = 0, y = 0, w = 10, h = 10, attrs: Attrs = {}): RectNode {
    return { id, kind: "rect", x, y, width: w, height: h, rx: 0, ry: 0, attrs };
}

function group(id: string, children: SvgNode[], attrs: Attrs = {}): GroupNode {
    return { id, kind: "g", children, attrs };
}

function load(...nodes: SvgNode[]): void {
    docState.doc.children = nodes;
}

describe("parseMatrixInput", () => {
    it("accepts six numbers, matrix(), and SVG transform lists", () => {
        expect(parseMatrixInput("1 0 0 1 10 20")).toEqual([1, 0, 0, 1, 10, 20]);
        expect(parseMatrixInput("1, 0, 0, 1, 10, 20")).toEqual([1, 0, 0, 1, 10, 20]);
        expect(parseMatrixInput("matrix(2 0 0 3 4 5)")).toEqual([2, 0, 0, 3, 4, 5]);
        expect(parseMatrixInput("translate(10, 20)")).toEqual([1, 0, 0, 1, 10, 20]);
        expect(parseMatrixInput("rotate(90)")).toEqual(rotateMatrix(90));
        expect(parseMatrixInput("translate(1 2) scale(2)")?.[0]).toBe(2);
    });

    it("rejects empty text, junk, and the wrong number of arguments", () => {
        expect(parseMatrixInput("")).toBeNull();
        expect(parseMatrixInput("   ")).toBeNull();
        expect(parseMatrixInput("hello")).toBeNull();
        expect(parseMatrixInput("1 2 3")).toBeNull();
        expect(parseMatrixInput("matrix(1 0 0 1 10)")).toBeNull();
        expect(parseMatrixInput("rotate(45 10)")).toBeNull();
        expect(parseMatrixInput("matrix(1 0 0 1 0 0) hello")).toBeNull();
    });
});

describe("commitMatrixText", () => {
    const current = "matrix(1 0 0 1 10 0)";

    it("leaves an unchanged value alone and refreshes when only the spacing differs", () => {
        expect(commitMatrixText(current, current)).toEqual({ ok: true, unchanged: true, refresh: false });
        expect(commitMatrixText(`  ${current}  `, current)).toMatchObject({ ok: true, unchanged: true, refresh: true });
    });

    it("turns an identity into a removal and keeps an equivalent transform as the canonical text", () => {
        expect(commitMatrixText("matrix(1 0 0 1 0 0)", current)).toMatchObject({ ok: true, unchanged: false, text: undefined });
        expect(commitMatrixText("translate(10 0)", current)).toMatchObject({ ok: true, unchanged: true, refresh: true });
        expect(commitMatrixText("translate(4 5)", current)).toMatchObject({ ok: true, unchanged: false, text: "matrix(1 0 0 1 4 5)" });
    });

    it("rejects text that is not a matrix", () => {
        expect(commitMatrixText("nope", current)).toEqual({ ok: false });
    });
});

describe("selectionMatrixView", () => {
    it("hides the row when no element has a matrix", () => {
        expect(selectionMatrixView([rect("a"), rect("b", 0, 0, 10, 10, { transform: "translate(0 0)" })])).toEqual({
            shown: false, mixed: false, text: "",
        });
    });

    it("shows one matrix, and Mixed when the selection disagrees", () => {
        const moved = rect("a", 0, 0, 10, 10, { transform: "translate(10 0)" });
        expect(selectionMatrixView([moved])).toEqual({ shown: true, mixed: false, text: "matrix(1 0 0 1 10 0)" });
        expect(selectionMatrixView([moved, rect("b")])).toMatchObject({ shown: true, mixed: true, text: "" });
        const same = rect("c", 0, 0, 10, 10, { transform: "matrix(1 0 0 1 10 0)" });
        expect(selectionMatrixView([moved, same])).toMatchObject({ shown: true, mixed: false, text: "matrix(1 0 0 1 10 0)" });
    });
});

describe("bakeNodeMatrix", () => {
    it("writes a translation into a rect and drops the matrix", () => {
        const node = rect("r", 1, 2, 4, 5, { transform: "translate(10 20)" });
        const next = bakeNodeMatrix(node, 3);
        expect(node.attrs.transform).toBe("translate(10 20)");
        expect(next).toMatchObject({ kind: "rect", x: 11, y: 22, width: 4, height: 5 });
        expect(next.attrs.transform).toBeUndefined();
    });

    it("turns a rotated rect into a path whose points are the rotated corners", () => {
        const next = bakeNodeMatrix(rect("r", 0, 0, 10, 10, { transform: "rotate(90)" }), 3);
        expect(next.kind).toBe("path");
        expect(next.attrs.transform).toBeUndefined();
        expect(localBBox(next)).toEqual({ x: -10, y: 0, width: 10, height: 10 });
    });

    it("writes a path's matrix into its points", () => {
        const next = bakeNodeMatrix({ id: "p", kind: "path", d: "M0 0 L10 0", attrs: { transform: "translate(5 6)" } }, 3) as PathNode;
        expect(next.d).toBe("M5 6 L15 6");
        expect(next.attrs.transform).toBeUndefined();
    });

    it("pushes a group's matrix into its children and leaves text with a transform", () => {
        const next = bakeNodeMatrix(group("g", [
            rect("r", 0, 0, 10, 10),
            { id: "t", kind: "passthrough", tag: "text", inner: "Hi", attrs: {} },
        ], { transform: "translate(10 0)" }), 3) as GroupNode;

        expect(next.attrs.transform).toBeUndefined();
        expect(next.children[0]).toMatchObject({ kind: "rect", x: 10, y: 0 });
        expect(next.children[0].attrs.transform).toBeUndefined();
        expect(next.children[1].attrs.transform).toBe("translate(10 0)");
    });

    it("scales stroke widths with a group's scale, keeping inherited widths correct", () => {
        const next = bakeNodeMatrix(group("g", [
            rect("own", 0, 0, 10, 10, { "stroke-width": "2" }),
            rect("inherits", 0, 0, 10, 10),
            { id: "t", kind: "passthrough", tag: "text", inner: "Hi", attrs: {} },
        ], { transform: "scale(2)", "stroke-width": "1" }), 3) as GroupNode;

        expect(next.attrs["stroke-width"]).toBe("2");
        expect(next.children[0].attrs["stroke-width"]).toBe("4");
        expect(next.children[1].attrs["stroke-width"]).toBeUndefined();
        expect(next.children[2].attrs["stroke-width"]).toBe("1");
    });

    it("keeps an inherited width from outside the baked group when its scale changes", () => {
        const outer = group("outer", [], { "stroke-width": "3" });
        const next = bakeNodeMatrix(group("g", [rect("r", 0, 0, 10, 10)], { transform: "scale(2)" }), 3, [outer]) as GroupNode;

        expect(next.attrs["stroke-width"]).toBe("6");
        expect(next.children[0].attrs["stroke-width"]).toBeUndefined();
    });

    it("does not bake a text element, and strip leaves the geometry alone", () => {
        const text: SvgNode = { id: "t", kind: "passthrough", tag: "text", inner: "Hi", attrs: { transform: "translate(5 6)" } };
        expect(canBakeMatrix(text)).toBe(false);
        expect(bakeNodeMatrix(text, 3).attrs.transform).toBe("translate(5 6)");

        const node = rect("r", 3, 4, 10, 10, { transform: "rotate(15)" });
        const stripped = stripNodeMatrix(node);
        expect(stripped).toMatchObject({ x: 3, y: 4 });
        expect(stripped.attrs.transform).toBeUndefined();
    });
});

describe("selection matrix commands", () => {
    it("applies, removes, and replaces the matrix on the selected elements", () => {
        load(
            rect("a", 0, 0, 10, 10, { transform: "translate(10 0)" }),
            rect("b", 0, 0, 10, 10, { transform: "translate(10 0)" }),
        );
        applySelectionMatrices(["a"]);
        expect(docState.doc.children[0]).toMatchObject({ kind: "rect", x: 10 });
        expect(docState.doc.children[0].attrs.transform).toBeUndefined();
        expect(docState.doc.children[1].attrs.transform).toBe("translate(10 0)");

        removeSelectionMatrices(["b"]);
        expect(docState.doc.children[1]).toMatchObject({ x: 0 });
        expect(docState.doc.children[1].attrs.transform).toBeUndefined();

        writeSelectionMatrix(["a", "b"], formatMatrix([2, 0, 0, 2, 0, 0]));
        expect(docState.doc.children[0].attrs.transform).toBe("matrix(2 0 0 2 0 0)");
        expect(docState.doc.children[1].attrs.transform).toBe("matrix(2 0 0 2 0 0)");
    });

    it("does not bake a text element", () => {
        load({ id: "t", kind: "passthrough", tag: "text", inner: "Hi", attrs: { transform: "translate(5 6)" } });
        applySelectionMatrices(["t"]);
        expect(docState.doc.children[0].attrs.transform).toBe("translate(5 6)");
        removeSelectionMatrices(["t"]);
        expect(docState.doc.children[0].attrs.transform).toBeUndefined();
    });
});
