import { describe, expect, it } from "vitest";
import { altDisablesSnap } from "../3-move-alt-snap";

describe("altDisablesSnap", () => {
    it("turns snapping off while Alt is held on a plain drag", () => {
        expect(altDisablesSnap(false, false)).toEqual({ duplicateAlt: false, disable: false });
        expect(altDisablesSnap(false, true)).toEqual({ duplicateAlt: false, disable: true });
        expect(altDisablesSnap(false, false)).toEqual({ duplicateAlt: false, disable: false });
    });

    it("keeps snapping on for the Alt press that started a copy, until it is released and pressed again", () => {
        let duplicateAlt = true;
        let step = altDisablesSnap(duplicateAlt, true);
        duplicateAlt = step.duplicateAlt;
        expect(step.disable).toBe(false);
        expect(duplicateAlt).toBe(true);

        step = altDisablesSnap(duplicateAlt, false);
        duplicateAlt = step.duplicateAlt;
        expect(step.disable).toBe(false);
        expect(duplicateAlt).toBe(false);

        step = altDisablesSnap(duplicateAlt, true);
        expect(step).toEqual({ duplicateAlt: false, disable: true });

        step = altDisablesSnap(step.duplicateAlt, false);
        expect(step).toEqual({ duplicateAlt: false, disable: false });
    });
});
