import { createStore } from "jotai";
import { proxy } from "valtio";
import { describe, expect, it } from "vitest";
import { atomWithValtio } from "../atom-with-valtio";

describe("atomWithValtio", () => {
    it("sees a change that happened before anything subscribed, as on a full page load", () => {
        const state = proxy({ doc: { children: [] as { id: string; }[] } });
        const docAtom = atomWithValtio(state);
        const store = createStore();

        // The saved document is loaded after the atom module is imported, before React renders
        state.doc = { children: [{ id: "g1" }] };

        expect(store.get(docAtom).doc.children.map((n) => n.id)).toEqual(["g1"]);
    });

    it("updates after a later change once subscribed", async () => {
        const state = proxy({ doc: { children: [] as { id: string; }[] } });
        const docAtom = atomWithValtio(state);
        const store = createStore();
        store.sub(docAtom, () => { });

        state.doc = { children: [{ id: "p1" }] };
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(store.get(docAtom).doc.children.map((n) => n.id)).toEqual(["p1"]);
    });
});
