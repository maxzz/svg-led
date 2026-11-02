import { type Anchor, type Attrs, type Point, type SubPath } from "../1-model/1-types";
import { pathDataToSubpaths, samePoint, subpathsToPathData } from "../5-anchors/1-path-anchors";
import { getPresentation } from "../8-style/1-presentation";

/**
 * Offset Path moves each existing anchor so it sits off the original path.
 * The anchor count does not change, and each anchor keeps its handles, shifted by the same amount.
 *
 * The distance is in the path's own units. A positive distance is to the left of the direction
 * of travel (y pointing down), which is outward for the usual clockwise shape. A negative distance
 * is the other way. A corner is placed where the offset edges meet. Round puts that same corner
 * on the offset circle instead. A miter longer than the miter limit stays one point, pulled in
 * along the same direction.
 *
 * An open straight line is a rectangle of no thickness. Offsetting it grows a real rectangle:
 * longer along the line, and thick across it.
 */

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

/** Offset geometry as path data. A zero distance returns `d` unchanged. */
export function offsetPathData(d: string, options: OffsetPathOptions, precision: number): string {
    if (!d.trim() || !Number.isFinite(options.offset)) {
        return '';
    }
    if (Math.abs(options.offset) < 1e-9) {
        return d;
    }
    const subs = pathDataToSubpaths(d).map((sub) => offsetSubpath(sub, options));
    return subpathsToPathData(subs, precision);
}

function offsetSubpath(sub: SubPath, options: OffsetPathOptions): SubPath {
    if (isStraightLine(sub)) {
        return lineAsRectangle(sub.anchors[0], sub.anchors[1], options.offset);
    }
    const limit = clampMiter(options.miterLimit);
    return {
        closed: sub.closed,
        anchors: sub.anchors.map((anchor, i) => place(sub, i, anchor, options.offset, options.joins, limit)),
    };
}

/** Two corners and nothing else: a single straight segment */
function isStraightLine(sub: SubPath): boolean {
    if (sub.closed || sub.anchors.length !== 2) {
        return false;
    }
    const [a, b] = sub.anchors;
    if (a.in || a.out || b.in || b.out) {
        return false;
    }
    return Math.hypot(b.x - a.x, b.y - a.y) > 1e-9;
}

/**
 * A line has no thickness, so it is offset as a rectangle: each end grows by the distance
 * along the line, and both sides grow by the distance across it.
 */
function lineAsRectangle(a: Anchor, b: Anchor, offset: number): SubPath {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const nx = dy / len;
    const ny = -dx / len;
    const d = Math.abs(offset);
    const corner = (base: Anchor, along: number, across: number): Anchor => ({
        x: base.x + ux * along + nx * across,
        y: base.y + uy * along + ny * across,
        kind: 'corner',
    });
    return {
        closed: true,
        anchors: [
            corner(a, -d, d),
            corner(b, d, d),
            corner(b, d, -d),
            corner(a, -d, -d),
        ],
    };
}

function place(sub: SubPath, index: number, anchor: Anchor, distance: number, join: OffsetJoin, miterLimit: number): Anchor {
    const n = sub.anchors.length;
    const prev = sub.closed || index > 0 ? sub.anchors[(index - 1 + n) % n] : null;
    const next = sub.closed || index < n - 1 ? sub.anchors[(index + 1) % n] : null;
    const nIn = prev ? leftOf(incomingDir(prev, anchor)) : null;
    const nOut = next ? leftOf(outgoingDir(anchor, next)) : null;
    const at = nIn && nOut
        ? join === 'round'
            ? roundAt(anchor, nIn, nOut, distance)
            : miterAt(anchor, nIn, nOut, distance, miterLimit)
        : shift(anchor, nOut ?? nIn, distance);
    return moveAnchor(anchor, { x: at.x - anchor.x, y: at.y - anchor.y });
}

/** Direction of travel arriving at `anchor` */
function incomingDir(prev: Anchor, anchor: Anchor): Point | null {
    if (anchor.in && !samePoint(anchor.in, anchor)) {
        return { x: anchor.x - anchor.in.x, y: anchor.y - anchor.in.y };
    }
    if (!samePoint(prev, anchor)) {
        return { x: anchor.x - prev.x, y: anchor.y - prev.y };
    }
    return null;
}

/** Direction of travel leaving `anchor` */
function outgoingDir(anchor: Anchor, next: Anchor): Point | null {
    if (anchor.out && !samePoint(anchor.out, anchor)) {
        return { x: anchor.out.x - anchor.x, y: anchor.out.y - anchor.y };
    }
    if (!samePoint(next, anchor)) {
        return { x: next.x - anchor.x, y: next.y - anchor.y };
    }
    return null;
}

function leftOf(dir: Point | null): Point | null {
    if (!dir) {
        return null;
    }
    const len = Math.hypot(dir.x, dir.y);
    if (len < 1e-9) {
        return null;
    }
    return { x: dir.y / len, y: -dir.x / len };
}

/** Where the two offset edges meet. A long miter is shortened but stays a single point. */
function miterAt(vertex: Point, nIn: Point, nOut: Point, distance: number, miterLimit: number): Point {
    if (nIn.x * nOut.x + nIn.y * nOut.y > 0.999) {
        return shift(vertex, nIn, distance);
    }
    const from = shift(vertex, nIn, distance);
    const to = shift(vertex, nOut, distance);
    const hit = lineHit(from, { x: -nIn.y, y: nIn.x }, to, { x: -nOut.y, y: nOut.x });
    if (!hit) {
        return from;
    }
    const reach = Math.abs(distance) * miterLimit;
    const dx = hit.x - vertex.x;
    const dy = hit.y - vertex.y;
    const dist = Math.hypot(dx, dy);
    if (dist > reach + 1e-6 && dist > 1e-9) {
        const scale = reach / dist;
        return { x: vertex.x + dx * scale, y: vertex.y + dy * scale };
    }
    return hit;
}

/** The one corner point that lies on the offset circle, halfway through the turn */
function roundAt(vertex: Point, nIn: Point, nOut: Point, distance: number): Point {
    let x = nIn.x + nOut.x;
    let y = nIn.y + nOut.y;
    const len = Math.hypot(x, y);
    if (len < 1e-9) {
        return shift(vertex, nIn, distance);
    }
    x /= len;
    y /= len;
    const sign = distance >= 0 ? 1 : -1;
    return { x: vertex.x + x * Math.abs(distance) * sign, y: vertex.y + y * Math.abs(distance) * sign };
}

function shift(p: Point, normal: Point | null, distance: number): Point {
    if (!normal) {
        return { x: p.x, y: p.y };
    }
    return { x: p.x + normal.x * distance, y: p.y + normal.y * distance };
}

function moveAnchor(anchor: Anchor, delta: Point): Anchor {
    const next: Anchor = { x: anchor.x + delta.x, y: anchor.y + delta.y, kind: anchor.kind };
    if (anchor.in) {
        next.in = { x: anchor.in.x + delta.x, y: anchor.in.y + delta.y };
    }
    if (anchor.out) {
        next.out = { x: anchor.out.x + delta.x, y: anchor.out.y + delta.y };
    }
    return next;
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

function clampMiter(value: number): number {
    return Number.isFinite(value) ? Math.max(1, value) : 4;
}
