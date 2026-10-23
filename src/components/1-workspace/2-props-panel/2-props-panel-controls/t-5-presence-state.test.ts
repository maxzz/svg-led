import { describe, expect, it } from "vitest";
import { combinePresence } from "./5-presence-state";

describe("combinePresence", () => {
    it("is checked when every state is checked", () => {
        expect(combinePresence([true])).toBe(true);
        expect(combinePresence([true, true, true])).toBe(true);
    });

    it("is unchecked when every state is unchecked, or there are none", () => {
        expect(combinePresence([false])).toBe(false);
        expect(combinePresence([false, false])).toBe(false);
        expect(combinePresence([])).toBe(false);
    });

    it("is mixed when the states differ", () => {
        expect(combinePresence([true, false])).toBe('indeterminate');
        expect(combinePresence([true, 'indeterminate'])).toBe('indeterminate');
        expect(combinePresence(['indeterminate'])).toBe('indeterminate');
    });
});
