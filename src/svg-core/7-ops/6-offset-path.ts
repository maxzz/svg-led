import { EndType, FillRule, JoinType, inflatePathsD, unionD, type PathD } from "clipper2-ts";
import { type Attrs, type Point, type SubPath } from "../1-model/1-types";
import { fitClosedPolyline } from "../4-geometry/5-fit-curve";
import { pathDataToSubpaths, subpathsToPathData } from "../5-anchors/1-path-anchors";
import { getPresentation } from "../8-style/1-presentation";

/**
 * Offset Path, as in Illustrator (Object > Path > Offset Path).
 *
 * A closed subpath is the filled area it encloses, read with the path's fill rule. A positive
 * distance grows that area by the distance in every direction, a negative distance shrinks it.
 * Holes shrink as the shape grows and grow as it shrinks. Parts that run into each other merge,
 * and parts narrower than twice an inset disappear.
 *
 * An open subpath is outlined on both sides at the distance. Its ends follow the joins:
 * square for Miter, round for Round, flat for Bevel.
 *
 * Corners use the joins. A miter longer than the miter limit (a multiple of the distance) is
 * squared off. The result is refitted with Bezier curves, so a circle stays a circle and a
 * straight edge stays one segment.
 */

export type OffsetJoin = 'miter' | 'round' | 'bevel';

export type OffsetPathOptions = {
    offset: number;
    joins: OffsetJoin;
    miterLimit: number;
    fillRule?: 'nonzero' | 'evenodd';
};

export function pathFillRule(attrs: Attrs): 'nonzero' | 'evenodd' {
    return getPresentation(attrs, 'fill-rule')?.trim().toLowerCase() === 'evenodd' ? 'evenodd' : 'nonzero';
}

/** Offset geometry as path data, or an empty string when nothing is left. A zero distance returns `d` unchanged. */
export function offsetPathData(d: string, options: OffsetPathOptions, precision: number): string {
    if (!d.trim() || !Number.isFinite(options.offset)) {
        return '';
    }
    const delta = options.offset;
    if (Math.abs(delta) < 1e-9) {
        return d;
    }

    const subs = pathDataToSubpaths(d).map(closeIfEndsMeet).filter((sub) => sub.anchors.length > 1);
    const size = extentOf(subs);
    if (!(size > 0)) {
        return '';
    }

    const tol = Math.max(Math.min(size * 2e-4, Math.abs(delta) * 0.1, 0.05), size * 1e-5, 1e-5);
    const fitTol = Math.max(tol * 2, Math.min(size * 6e-4, Math.abs(delta) * 0.25, 0.15));
    const clipPrec = Math.min(8, Math.max(0, Math.ceil(Math.log10(100 / tol))));
    const arcTol = Math.min(tol, Math.abs(delta) * 0.005);
    const maxTurn = Math.min(0.15, Math.sqrt((8 * tol) / Math.abs(delta)));
    // Curves are flattened into steps no longer than this; a longer edge in the result is a straight line.
    const maxStep = size / 24;
    const minLine = 1.5 * (maxStep + Math.abs(delta) * maxTurn) + tol * 4;
    const join = options.joins === 'round' ? JoinType.Round : options.joins === 'bevel' ? JoinType.Bevel : JoinType.Miter;
    const miterLimit = Number.isFinite(options.miterLimit) ? Math.max(1, options.miterLimit) : 4;

    const closed: PathD[] = [];
    const open: PathD[] = [];
    for (const sub of subs) {
        const pts = flattenSubpath(sub, { tol, maxTurn, maxStep });
        if (sub.closed && pts.length >= 3) {
            closed.push(pts);
        } else if (!sub.closed && pts.length >= 2) {
            open.push(pts);
        }
    }

    let rings: PathD[] = [];
    if (closed.length) {
        const fillRule = options.fillRule === 'evenodd' ? FillRule.EvenOdd : FillRule.NonZero;
        const region = unionD(closed, [], fillRule, clipPrec);
        rings = inflatePathsD(region, delta, join, EndType.Polygon, miterLimit, clipPrec, arcTol);
    }
    if (open.length) {
        const ends = options.joins === 'round' ? EndType.Round : options.joins === 'bevel' ? EndType.Butt : EndType.Square;
        const outlines = inflatePathsD(open, Math.abs(delta), join, ends, miterLimit, clipPrec, arcTol);
        rings = rings.length ? unionD(rings, outlines, FillRule.NonZero, clipPrec) : outlines;
    }

    const fitted = rings
        .map((ring) => fitClosedPolyline(ring, fitTol, minLine))
        .filter((sub): sub is SubPath => !!sub);
    return subpathsToPathData(fitted, precision);
}

/** An open subpath whose last anchor sits on its first is offset as a closed one */
function closeIfEndsMeet(sub: SubPath): SubPath {
    const { anchors } = sub;
    if (sub.closed || anchors.length < 3) {
        return sub;
    }
    const first = anchors[0];
    const last = anchors[anchors.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-6) {
        return sub;
    }
    const rest = anchors.slice(0, -1);
    rest[0] = { ...first, in: last.in };
    return { closed: true, anchors: rest };
}

function extentOf(subs: readonly SubPath[]): number {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const sub of subs) {
        for (const a of sub.anchors) {
            minX = Math.min(minX, a.x);
            minY = Math.min(minY, a.y);
            maxX = Math.max(maxX, a.x);
            maxY = Math.max(maxY, a.y);
        }
    }
    return Math.max(maxX - minX, maxY - minY);
}

//---------------------------------------------------------------------------
// Flatten. A curve is split until it is within `tol` of its chord, turns less than `maxTurn`
// (so the far side of a large offset is as smooth as the near side), and is no longer than `maxStep`.

type Flatness = { tol: number; maxTurn: number; maxStep: number; };

function flattenSubpath(sub: SubPath, flatness: Flatness): Point[] {
    const { anchors } = sub;
    const out: Point[] = [{ x: anchors[0].x, y: anchors[0].y }];
    const count = sub.closed ? anchors.length : anchors.length - 1;
    for (let i = 0; i < count; i++) {
        const a = anchors[i];
        const b = anchors[(i + 1) % anchors.length];
        if (!a.out && !b.in) {
            pushPoint(out, b);
        } else {
            flattenCubic(a, a.out ?? a, b.in ?? b, b, flatness, out, 0);
        }
    }
    if (sub.closed && out.length > 1) {
        const first = out[0];
        const last = out[out.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-9) {
            out.pop();
        }
    }
    return out.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function flattenCubic(p0: Point, c1: Point, c2: Point, p3: Point, f: Flatness, out: Point[], depth: number): void {
    const flat = depth >= 18 || (
        lineDist(c1, p0, p3) <= f.tol
        && lineDist(c2, p0, p3) <= f.tol
        && controlTurn(p0, c1, c2, p3) <= f.maxTurn
        && Math.hypot(c1.x - p0.x, c1.y - p0.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(p3.x - c2.x, p3.y - c2.y) <= f.maxStep
    );
    if (flat) {
        pushPoint(out, p3);
        return;
    }
    const m01 = mid(p0, c1), m12 = mid(c1, c2), m23 = mid(c2, p3);
    const m012 = mid(m01, m12), m123 = mid(m12, m23);
    const m = mid(m012, m123);
    flattenCubic(p0, m01, m012, m, f, out, depth + 1);
    flattenCubic(m, m123, m23, p3, f, out, depth + 1);
}

/** How far the control polygon turns, which bounds how far the curve turns */
function controlTurn(...pts: Point[]): number {
    let total = 0;
    let prev: Point | null = null;
    for (let i = 1; i < pts.length; i++) {
        const v = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
        if (Math.hypot(v.x, v.y) < 1e-12) {
            continue;
        }
        if (prev) {
            total += Math.abs(Math.atan2(prev.x * v.y - prev.y * v.x, prev.x * v.x + prev.y * v.y));
        }
        prev = v;
    }
    return total;
}

function mid(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lineDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) {
        return Math.hypot(p.x - a.x, p.y - a.y);
    }
    return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
}

function pushPoint(out: Point[], p: Point): void {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 1e-9) {
        out.push({ x: p.x, y: p.y });
    }
}
