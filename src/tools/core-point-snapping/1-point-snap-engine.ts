import type { Point, Rect } from "@/svg-core";
import type { SnapAxis } from "@/tools/core-snapping/1-snap-engine";

/**
 * Pure geometry for Illustrator-like smart guides on a single dragged point (document units, no React, no state).
 * The point lands on a target point within reach, or else lines up horizontally and/or vertically with targets.
 * Anchors and handles (tier 0) win over the bounds and centers of objects (tier 1).
 */

/** Lower tiers win: 0 for anchors and handles, 1 for object bounds and centers */
export type SnapTier = 0 | 1;

export const TIER_POINT: SnapTier = 0;
export const TIER_OBJECT: SnapTier = 1;

export type PointTarget = Point & { tier: SnapTier; };

/** A guide line from the snapped point to the target it lines up with */
export type PointSnapGuide = { x1: number; y1: number; x2: number; y2: number; };

export type PointSnapResult = {
    point: Point;                // where the dragged point goes
    snapped: boolean;
    guides: PointSnapGuide[];
    marks: Point[];              // targets the point snapped to, and the crossing of two guides; drawn as small crosses
};

export type PointSnapOptions = {
    threshold: number;           // max distance in document units at which a snap is taken
    axes: readonly SnapAxis[];   // axes the point may move along; with one axis it never lands on a point
};

const EPS = 1e-6;

export function snapPoint(p: Point, targets: readonly PointTarget[], opts: PointSnapOptions): PointSnapResult {
    if (opts.axes.length === 2) {
        const hit = nearestPoint(p, targets, opts.threshold);
        if (hit) {
            const point = { x: hit.x, y: hit.y };
            return { point, snapped: true, guides: [], marks: [point] };
        }
    }

    const point = { ...p };
    const aligned: { axis: SnapAxis; target: PointTarget; }[] = [];

    for (const axis of opts.axes) {
        const best = nearestOnAxis(p, targets, axis, opts.threshold);
        if (best) {
            point[axis] = best[axis];
            aligned.push({ axis, target: best });
        }
    }

    if (!aligned.length) {
        return { point, snapped: false, guides: [], marks: [] };
    }

    const guides: PointSnapGuide[] = [];
    const marks: Point[] = [];
    for (const { axis } of aligned) {
        const target = closestAligned(point, targets, axis);
        if (target) {
            guides.push({ x1: target.x, y1: target.y, x2: point.x, y2: point.y });
            marks.push({ x: target.x, y: target.y });
        }
    }
    if (aligned.length === 2) {
        marks.push({ ...point });
    }
    return { point, snapped: true, guides, marks };
}

/** Target within `threshold` of `p`: the lowest tier first, then the nearest */
function nearestPoint(p: Point, targets: readonly PointTarget[], threshold: number): PointTarget | undefined {
    let best: PointTarget | undefined;
    let bestDist = Infinity;
    for (const t of targets) {
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d > threshold + EPS) {
            continue;
        }
        if (!best || t.tier < best.tier || (t.tier === best.tier && d < bestDist - EPS)) {
            best = t;
            bestDist = d;
        }
    }
    return best;
}

/** Target whose coordinate on `axis` is within `threshold` of `p`: the lowest tier first, then the nearest */
function nearestOnAxis(p: Point, targets: readonly PointTarget[], axis: SnapAxis, threshold: number): PointTarget | undefined {
    let best: PointTarget | undefined;
    let bestDist = Infinity;
    for (const t of targets) {
        const d = Math.abs(t[axis] - p[axis]);
        if (d > threshold + EPS) {
            continue;
        }
        const tie = t.tier === best?.tier && Math.abs(d - bestDist) <= EPS;
        if (!best || t.tier < best.tier || (t.tier === best.tier && d < bestDist - EPS) || (tie && crossDist(p, t, axis) < crossDist(p, best, axis))) {
            best = t;
            bestDist = d;
        }
    }
    return best;
}

/** Among targets lined up with `point` on `axis`, the one nearest along the guide (any tier) */
function closestAligned(point: Point, targets: readonly PointTarget[], axis: SnapAxis): PointTarget | undefined {
    let best: PointTarget | undefined;
    for (const t of targets) {
        if (Math.abs(t[axis] - point[axis]) <= EPS && (!best || crossDist(point, t, axis) < crossDist(point, best, axis))) {
            best = t;
        }
    }
    return best;
}

function crossDist(p: Point, t: Point, axis: SnapAxis): number {
    return axis === 'x' ? Math.abs(t.y - p.y) : Math.abs(t.x - p.x);
}

//---------------------------------------------------------------------------

/** Corners, edge midpoints and center of a box: lining up with them follows the box edges and center lines */
export function boxTargets(r: Rect): PointTarget[] {
    const xs = [r.x, r.x + r.width / 2, r.x + r.width];
    const ys = [r.y, r.y + r.height / 2, r.y + r.height];
    return xs.flatMap((x) => ys.map((y) => ({ x, y, tier: TIER_OBJECT })));
}
