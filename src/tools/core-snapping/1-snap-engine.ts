import { type Rect } from "@/svg-core";

/**
 * Pure geometry for "Snap to objects" (document units, no React, no state).
 * Alignment snaps the edges and centers of a moving box to those of other boxes.
 * Spacing snaps the gap between the moving box and a neighbor to a gap that already exists between two other boxes.
 */

export type SnapAxis = 'x' | 'y';

/** A guide segment. `gap` is set for spacing guides, which are drawn with end ticks and a length label. */
export type SnapGuide = { x1: number; y1: number; x2: number; y2: number; gap?: number; };

export type SnapOffset = { dx: number; dy: number; guides: SnapGuide[]; };

export type SnapOptions = {
    threshold: number;           // max distance in document units at which a snap is taken
    spacing: boolean;            // also snap equal gaps
    axes: readonly SnapAxis[];   // axes to snap; the other axis is never moved
};

const EPS = 1e-6;

type Candidate = { delta: number; guides: SnapGuide[]; };

/** Snaps `box` to `others`; returns the offset to add to the box position */
export function snapBox(box: Rect, others: readonly Rect[], opts: SnapOptions): SnapOffset {
    const offset = { dx: 0, dy: 0 };
    const guides: SnapGuide[] = [];

    for (const axis of opts.axes) {
        const best = bestCandidate(box, others, axis, opts);
        if (!best) {
            continue;
        }
        offset[axis === 'x' ? 'dx' : 'dy'] = best.delta;

        const placed = { ...box, x: box.x + offset.dx, y: box.y + offset.dy };
        guides.push(...alignGuides(placed, others, axis), ...best.guides);
    }

    return { ...offset, guides };
}

function bestCandidate(box: Rect, others: readonly Rect[], axis: SnapAxis, opts: SnapOptions): Candidate | undefined {
    let best: Candidate | undefined;
    const consider = (c: Candidate) => {
        if (Math.abs(c.delta) <= opts.threshold + EPS && (!best || Math.abs(c.delta) < Math.abs(best.delta) - EPS)) {
            best = c;
        }
    };

    // alignment first, so it wins ties against spacing
    const mine = values(box, axis);
    for (const o of others) {
        for (const ov of values(o, axis)) {
            for (const mv of mine) {
                consider({ delta: ov - mv, guides: [] });
            }
        }
    }

    if (opts.spacing) {
        spacingCandidates(box, others, axis).forEach(consider);
    }

    return best;
}

/** Placements where the gap to a neighbor equals a gap that already exists between two other boxes */
function spacingCandidates(box: Rect, others: readonly Rect[], axis: SnapAxis): Candidate[] {
    const cross = crossRange(box, axis);
    const cross2 = (cross.lo + cross.hi) / 2;

    // boxes that share the moving box's row (or column), sorted along the axis
    const row = others
        .filter((o) => {
            const c = crossRange(o, axis);
            return Math.min(c.hi, cross.hi) - Math.max(c.lo, cross.lo) > EPS;
        })
        .map((o) => ({ lo: range(o, axis).lo, hi: range(o, axis).hi }))
        .sort((a, b) => a.lo - b.lo);

    const size = range(box, axis).hi - range(box, axis).lo;
    const rv: Candidate[] = [];

    const seg = (from: number, to: number): SnapGuide => (
        axis === 'x'
            ? { x1: from, y1: cross2, x2: to, y2: cross2, gap: to - from }
            : { x1: cross2, y1: from, x2: cross2, y2: to, gap: to - from }
    );
    const pairSeg = (a: { lo: number; hi: number; }, b: { lo: number; hi: number; }) => seg(a.hi, b.lo);

    for (let i = 0; i < row.length; i++) {
        for (let j = i + 1; j < row.length; j++) {
            const a = row[i];
            const b = row[j];
            const d = b.lo - a.hi;
            if (d <= EPS) {
                continue;
            }
            // the moving box goes right of b, left of a, or centered between them
            const rightOfB = b.hi + d;
            rv.push({ delta: rightOfB - range(box, axis).lo, guides: [pairSeg(a, b), seg(b.hi, rightOfB)] });

            const leftOfA = a.lo - d;
            rv.push({ delta: leftOfA - size - range(box, axis).lo, guides: [pairSeg(a, b), seg(leftOfA - size, a.lo)] });

            if (size < d - EPS) {
                const between = a.hi + (d - size) / 2;
                rv.push({
                    delta: between - range(box, axis).lo,
                    guides: [seg(a.hi, between), seg(between + size, b.lo)],
                });
            }
        }
    }
    return rv;
}

/** Guides for every edge or center that now lines up with another box */
function alignGuides(placed: Rect, others: readonly Rect[], axis: SnapAxis): SnapGuide[] {
    const rv: SnapGuide[] = [];
    const seen = new Set<string>();
    const mine = values(placed, axis);
    const myCross = crossRange(placed, axis);

    for (const o of others) {
        const oCross = crossRange(o, axis);
        const from = Math.min(myCross.lo, oCross.lo);
        const to = Math.max(myCross.hi, oCross.hi);

        for (const ov of values(o, axis)) {
            for (const mv of mine) {
                if (Math.abs(ov - mv) > EPS) {
                    continue;
                }
                const key = `${mv.toFixed(3)}:${from.toFixed(3)}:${to.toFixed(3)}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                rv.push(axis === 'x'
                    ? { x1: mv, y1: from, x2: mv, y2: to }
                    : { x1: from, y1: mv, x2: to, y2: mv }
                );
            }
        }
    }
    return rv;
}

//---------------------------------------------------------------------------

/** Low, middle and high coordinate of a rect along an axis */
function values(r: Rect, axis: SnapAxis): number[] {
    const { lo, hi } = range(r, axis);
    return [lo, (lo + hi) / 2, hi];
}

function range(r: Rect, axis: SnapAxis): { lo: number; hi: number; } {
    return axis === 'x'
        ? { lo: r.x, hi: r.x + r.width }
        : { lo: r.y, hi: r.y + r.height };
}

function crossRange(r: Rect, axis: SnapAxis): { lo: number; hi: number; } {
    return range(r, axis === 'x' ? 'y' : 'x');
}
