import { describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";

vi.mock("@/utils/theme-apply", () => ({ themeApplyMode: () => {} }));

import { ToolId, activeToolIdAtom, setActiveToolAtom, toolGestureActiveAtom } from "@/store/4-editor";
import { pressSpringKeyAtom, releaseSpringKeyAtom, springGestureEndedAtom, springToolChangedAtom } from "../1-tool-spring-atoms";

function setup() {
    const store = createStore();
    store.sub(activeToolIdAtom, () => store.set(springToolChangedAtom));
    return store;
}

describe("Ctrl tool spring", () => {
    it("switches from the Pen to the selection tool used last and back", () => {
        const store = setup();
        store.set(setActiveToolAtom, ToolId.points);
        store.set(setActiveToolAtom, ToolId.pen);

        store.set(pressSpringKeyAtom);
        expect(store.get(activeToolIdAtom)).toBe(ToolId.points);

        store.set(releaseSpringKeyAtom);
        expect(store.get(activeToolIdAtom)).toBe(ToolId.pen);
    });

    it("does nothing when the Pen is not active", () => {
        const store = setup();
        store.set(setActiveToolAtom, ToolId.rectangle);
        store.set(pressSpringKeyAtom);
        expect(store.get(activeToolIdAtom)).toBe(ToolId.rectangle);
    });

    it("waits for a drag to end before returning", () => {
        const store = setup();
        store.set(setActiveToolAtom, ToolId.select);
        store.set(setActiveToolAtom, ToolId.pen);
        store.set(pressSpringKeyAtom);

        store.set(toolGestureActiveAtom, true);
        store.set(releaseSpringKeyAtom);
        expect(store.get(activeToolIdAtom)).toBe(ToolId.select);

        store.set(toolGestureActiveAtom, false);
        store.set(springGestureEndedAtom);
        expect(store.get(activeToolIdAtom)).toBe(ToolId.pen);
    });

    it("stays on a tool picked while Ctrl is held", () => {
        const store = setup();
        store.set(setActiveToolAtom, ToolId.pen);
        store.set(pressSpringKeyAtom);
        store.set(setActiveToolAtom, ToolId.ellipse);
        store.set(releaseSpringKeyAtom);
        expect(store.get(activeToolIdAtom)).toBe(ToolId.ellipse);
    });
});
