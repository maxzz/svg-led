import { describe, expect, it } from "vitest";
import { MAJOR_MIN_PX, MINOR_MIN_PX, TickKind, rulerSteps, rulerTicks } from "./1-ruler-ticks";

describe("rulerSteps", () => {
    it("labels a small viewBox densely and a large one sparsely", () => {
        expect(rulerSteps(25).major).toBe(2);      // 24-unit icon fitted to ~600px
        expect(rulerSteps(0.5).major).toBe(100);   // 1200-unit drawing fitted to ~600px
        expect(rulerSteps(0.05).major).toBe(1000);
    });

    it("keeps labeled and unlabeled ticks apart on screen at any zoom", () => {
        for (const zoom of [0.02, 0.037, 0.3, 1, 3.3, 17, 99, 256]) {
            const { major, perMajor } = rulerSteps(zoom);
            expect(major * zoom).toBeGreaterThanOrEqual(MAJOR_MIN_PX - 1e-6);
            expect((major / perMajor) * zoom).toBeGreaterThanOrEqual(MINOR_MIN_PX - 1e-6);
            expect([1, 2, 5]).toContain(Math.round(major / 10 ** Math.floor(Math.log10(major) + 1e-9)));
        }
    });

    it("uses fraction digits only for fractional steps", () => {
        expect(rulerSteps(1).decimals).toBe(0);
        expect(rulerSteps(200).decimals).toBe(1);  // major 0.5
    });
});

describe("rulerTicks", () => {
    const axis = { from: 0, to: 24, zoom: 25, offset: 100, clipFrom: 0, clipTo: 2000 };

    it("spans the viewBox edge with labels on major ticks and a longer tick halfway", () => {
        const steps = rulerSteps(axis.zoom);       // major 2, four minor intervals
        const ticks = rulerTicks(steps, axis);
        expect(ticks[0]).toEqual({ pos: 100, kind: TickKind.major, label: '0' });
        expect(ticks.at(-1)).toEqual({ pos: 700, kind: TickKind.major, label: '24' });
        expect(ticks.slice(1, 4).map((t) => t.kind)).toEqual([TickKind.minor, TickKind.mid, TickKind.minor]);
        expect(ticks.filter((t) => t.label).map((t) => t.label)).toEqual(['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24']);
    });

    it("skips ticks outside the visible screen range", () => {
        const ticks = rulerTicks(rulerSteps(axis.zoom), { ...axis, clipFrom: 300, clipTo: 400 });
        expect(ticks.every((t) => t.pos >= 300 && t.pos <= 400)).toBe(true);
        expect(ticks.filter((t) => t.label).map((t) => t.label)).toEqual(['8', '10', '12']);
    });

    it("labels negative and fractional values without float noise", () => {
        const ticks = rulerTicks(rulerSteps(200), { from: -1, to: 1, zoom: 200, offset: 0, clipFrom: -1000, clipTo: 1000 });
        expect(ticks.filter((t) => t.label).map((t) => t.label)).toEqual(['-1', '-0.5', '0', '0.5', '1']);
    });
});
