/** Smallest screen distance between labeled ticks; leaves room for a label like "-1250" */
export const MAJOR_MIN_PX = 48;
/** Smallest screen distance between unlabeled ticks */
export const MINOR_MIN_PX = 5;

export const TickKind = {
    minor: 'minor',              // Short unlabeled tick
    mid: 'mid',                  // Halfway between two labeled ticks, a bit longer
    major: 'major',              // Long tick with a number
} as const;

export type TickKind = typeof TickKind[keyof typeof TickKind];

export type RulerTick = {
    pos: number;                 // Screen position along the ruler, in canvas pixels
    kind: TickKind;
    label?: string;              // Document value, only on major ticks
};

export type RulerSteps = {
    major: number;               // Document units between labeled ticks: 1, 2 or 5 times a power of ten
    perMajor: number;            // Minor intervals in one major interval
    decimals: number;            // Fraction digits the labels need
};

/**
 * Tick spacing for a zoom (screen pixels per document unit).
 * Labeled ticks are at least MAJOR_MIN_PX apart, so a large viewBox (small zoom) gets fewer, rounder numbers.
 */
export function rulerSteps(zoom: number): RulerSteps {
    const raw = MAJOR_MIN_PX / zoom;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const base = [1, 2, 5, 10].find((b) => b * pow >= raw * (1 - 1e-9)) ?? 10;
    const major = base * pow;

    const divisions = base === 2 ? [4, 2] : base === 5 ? [5] : [10, 5, 2];
    const perMajor = divisions.find((n) => (major / n) * zoom >= MINOR_MIN_PX) ?? 1;

    return { major, perMajor, decimals: Math.max(0, -Math.floor(Math.log10(major) + 1e-9)) };
}

export type RulerAxis = {
    from: number;                // Document range covered by the ruler (the viewBox edge)
    to: number;
    zoom: number;                // screen = doc * zoom + offset
    offset: number;
    clipFrom: number;            // Visible screen range; ticks outside it are skipped
    clipTo: number;
};

/** Ticks of one ruler, limited to the part of the viewBox edge that is on screen */
export function rulerTicks(steps: RulerSteps, axis: RulerAxis): RulerTick[] {
    const { from, to, zoom, offset, clipFrom, clipTo } = axis;
    if (!(zoom > 0)) {
        return [];
    }

    const lo = Math.max(from, (clipFrom - offset) / zoom);
    const hi = Math.min(to, (clipTo - offset) / zoom);
    const minor = steps.major / steps.perMajor;
    const eps = minor * 1e-6;

    const ticks: RulerTick[] = [];
    for (let i = Math.ceil((lo - eps) / minor), last = Math.floor((hi + eps) / minor); i <= last; i++) {
        const value = i * minor;
        const pos = value * zoom + offset;
        const index = ((i % steps.perMajor) + steps.perMajor) % steps.perMajor;

        if (index === 0) {
            ticks.push({ pos, kind: TickKind.major, label: formatLabel(value, steps.decimals) });
        } else {
            ticks.push({ pos, kind: steps.perMajor % 2 === 0 && index === steps.perMajor / 2 ? TickKind.mid : TickKind.minor });
        }
    }
    return ticks;
}

function formatLabel(value: number, decimals: number): string {
    return String(Number(value.toFixed(decimals))); // String(-0) is "0"
}
