import { EndType, FillRule, JoinType, inflatePathsD, unionD, type PathD } from "clipper2-ts";
import { type Attrs, type Point } from "../1-model/1-types";
import { makeFmt } from "../3-serialize/1-format";
import { flattenPathData } from "./5-expand-stroke";
import { getPresentation } from "../8-style/1-presentation";

/**
 * Offset Path builds a parallel curve.
 *
 * The distance is in the path's own units (the same space as `d` and stroke widths).
 * A positive distance expands a closed path and shifts an open path to its left
 * (left of the direction of travel, with y pointing down). A negative distance does the opposite.
 * Corners are mitered or rounded. A miter longer than `miterLimit` times the distance is cut flat.
 * Curves are flattened, the same way Expand turns a stroke into a filled outline.
 */

const CLIP_PREC = 4;

export type OffsetJoin = 'miter' | 'round';

export type OffsetPathOptions = {
    offset: number;
    joins: OffsetJoin;
    miterLimit: number;
    fillRule?: 'nonzero' | 'evenodd';
};

export function pathFillRule(attrs: Attrs): 'nonzero' | 'evenodd' {
    return getPresentation(attrs, 'fill-rule')?.trim().toLowerCase() === 'evenodd' ? 'evenodd' : 'nonzero';
}

/** Offset geometry as path data, or '' when the offset removes the path. A zero distance returns `d` unchanged. */
export function offsetPathData(d: string, options: OffsetPathOptions, precision: number): string {
    if (!d.trim() || !Number.isFinite(options.offset)) {
        return '';
    }
    if (Math.abs(options.offset) < 1e-9) {
        return d;
    }

    const tol = Math.min(0.5, Math.max(Math.abs(options.offset) * 0.05, 0.05));
    const polys = flattenPathData(d, tol).filter((p) => p.pts.length >= 2 && p.pts.every((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y)));
    const closed = polys.filter((p) => p.closed && p.pts.length >= 3);
    const open = polys.filter((p) => !p.closed && p.pts.length >= 2);
    const fmt = makeFmt(precision);
    const parts: string[] = [];

    for (const ring of offsetClosed(closed.map((p) => p.pts), options)) {
        const text = ringToD(ring, fmt);
        if (text) {
            parts.push(text);
        }
    }
    for (const poly of open) {
        const text = lineToD(offsetOpen(poly.pts, options), fmt);
        if (text) {
            parts.push(text);
        }
    }
    return parts.join(' ');
}

//---------------------------------------------------------------------------
// Closed subpaths. Clipper expands the outer contour and shrinks holes.

function offsetClosed(paths: Point[][], options: OffsetPathOptions): Point[][] {
    if (!paths.length) {
        return [];
    }
    const rule = options.fillRule === 'evenodd' ? FillRule.EvenOdd : FillRule.NonZero;
    const base = paths.length === 1 ? paths : unionD(paths, [], rule, CLIP_PREC);
    if (!base.length) {
        return [];
    }
    const distance = options.offset;
    const join = options.joins === 'round' ? JoinType.Round : JoinType.Miter;
    const limit = clampMiter(options.miterLimit);
    const inflated = inflatePathsD(base, distance, join, EndType.Polygon, limit, CLIP_PREC, arcTol(Math.abs(distance)));
    return inflated.map(cleanRing).filter((ring) => ring.length >= 3 && Math.abs(ringArea(ring)) > 1e-8);
}

function arcTol(radius: number): number {
    return Math.min(Math.max(radius * 0.02, 1e-4), 0.25);
}

function clampMiter(value: number): number {
    return Number.isFinite(value) ? Math.max(1, value) : 4;
}

function cleanRing(path: PathD): Point[] {
    const pts = dedupe(path.map((p) => ({ x: p.x, y: p.y })));
    if (pts.length > 1 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) <= 1e-6) {
        pts.pop();
    }
    return pts;
}

function ringArea(pts: readonly Point[]): number {
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return sum / 2;
}

function ringToD(pts: readonly Point[], fmt: (n: number) => string): string {
    if (pts.length < 3) {
        return '';
    }
    let text = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
    for (let i = 1; i < pts.length; i++) {
        text += ` L${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
    }
    return `${text} Z`;
}

function lineToD(pts: readonly Point[], fmt: (n: number) => string): string {
    if (pts.length < 2) {
        return '';
    }
    let text = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
    for (let i = 1; i < pts.length; i++) {
        text += ` L${fmt(pts[i].x)} ${fmt(pts[i].y)}`;
    }
    return text;
}

//---------------------------------------------------------------------------
// Open subpaths: one parallel curve, not a closed outline.

function offsetOpen(pts: readonly Point[], options: OffsetPathOptions): Point[] {
    const src = dedupe(pts);
    if (src.length < 2) {
        return [];
    }
    const normals: Point[] = [];
    for (let i = 0; i < src.length - 1; i++) {
        const n = leftNormal(src[i], src[i + 1]);
        if (!n) {
            return [];
        }
        normals.push(n);
    }

    const distance = options.offset;
    const out: Point[] = [shift(src[0], normals[0], distance)];
    for (let i = 1; i < src.length - 1; i++) {
        joinAt(out, src[i], normals[i - 1], normals[i], distance, options.joins, clampMiter(options.miterLimit));
    }
    out.push(shift(src[src.length - 1], normals[normals.length - 1], distance));
    return dedupe(out).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/** Left of the segment in screen space (y down): positive offsets use this side */
function leftNormal(a: Point, b: Point): Point | null {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) {
        return null;
    }
    return { x: dy / len, y: -dx / len };
}

function shift(p: Point, normal: Point, distance: number): Point {
    return { x: p.x + normal.x * distance, y: p.y + normal.y * distance };
}

function joinAt(out: Point[], vertex: Point, nIn: Point, nOut: Point, distance: number, join: OffsetJoin, miterLimit: number): void {
    const from = shift(vertex, nIn, distance);
    const to = shift(vertex, nOut, distance);
    if (nIn.x * nOut.x + nIn.y * nOut.y > 0.999) {
        out.push(from);
        return;
    }
    if (join === 'round') {
        out.push(from);
        pushArc(out, vertex, from, to);
        out.push(to);
        return;
    }

    const dirIn = { x: -nIn.y, y: nIn.x };
    const dirOut = { x: -nOut.y, y: nOut.x };
    const hit = lineHit(from, dirIn, to, dirOut);
    const reach = Math.abs(distance) * miterLimit;
    if (!hit || Math.hypot(hit.x - vertex.x, hit.y - vertex.y) > reach + 1e-6) {
        out.push(from, to);
        return;
    }
    out.push(hit);
}

/** Short arc from `from` to `to` around `center`. Both points sit on the circle. */
function pushArc(out: Point[], center: Point, from: Point, to: Point): void {
    const radius = Math.hypot(from.x - center.x, from.y - center.y);
    if (radius < 1e-9) {
        return;
    }
    const a0 = Math.atan2(from.y - center.y, from.x - center.x);
    const a1 = Math.atan2(to.y - center.y, to.x - center.x);
    let sweep = a1 - a0;
    if (sweep > Math.PI) {
        sweep -= Math.PI * 2;
    } else if (sweep < -Math.PI) {
        sweep += Math.PI * 2;
    }
    const tol = arcTol(radius);
    const step = 2 * Math.acos(Math.min(1, Math.max(-1, 1 - tol / radius)));
    const count = Math.max(1, Math.ceil(Math.abs(sweep) / Math.max(step, 1e-3)));
    for (let i = 1; i < count; i++) {
        const a = a0 + sweep * (i / count);
        out.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
    }
}

function lineHit(origin: Point, dir: Point, origin2: Point, dir2: Point): Point | null {
    const cross = dir.x * dir2.y - dir.y * dir2.x;
    if (Math.abs(cross) < 1e-12) {
        return null;
    }
    const dx = origin2.x - origin.x;
    const dy = origin2.y - origin.y;
    const t = (dx * dir2.y - dy * dir2.x) / cross;
    return { x: origin.x + dir.x * t, y: origin.y + dir.y * t };
}

function dedupe(pts: readonly Point[]): Point[] {
    const out: Point[] = [];
    for (const p of pts) {
        const prev = out[out.length - 1];
        if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 1e-6) {
            out.push({ x: p.x, y: p.y });
        }
    }
    return out;
}
