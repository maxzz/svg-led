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
 * A curve's handles are scaled with the offset, so the bend grows or shrinks instead of only sliding.
 * An open straight line is a rectangle of no thickness. Offsetting it grows a rectangle on the
 * offset side only: longer along the line, and thick toward that one side.
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
    const anchors = sub.anchors.map((anchor, i) => place(sub, i, anchor, options.offset, options.joins, limit));
    // Rounded corners are circular fillets. Rebuild those from the offset radius so a
    // negative offset stays round, and becomes one sharp corner once the radius is used up.
    applyFillets(sub.anchors, anchors, options.offset, sub.closed);
    return { closed: sub.closed, anchors };
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
 * A line has no thickness, so it is offset as a rectangle on one side of the line.
 * The ends move out along the line by the distance, and the thickness lies only on the offset side.
 */
function lineAsRectangle(a: Anchor, b: Anchor, offset: number): SubPath {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const nx = dy / len;
    const ny = -dx / len;
    const corner = (base: Anchor, along: number, across: number): Anchor => ({
        x: base.x + ux * along + nx * across,
        y: base.y + uy * along + ny * across,
        kind: 'corner',
    });
    return {
        closed: true,
        anchors: [
            corner(a, -offset, 0),
            corner(b, offset, 0),
            corner(b, offset, offset),
            corner(a, -offset, offset),
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
    return moveAnchor(sub, index, anchor, at, distance);
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

/**
 * The anchor moves onto the offset. Each handle is scaled about that anchor so the curve
 * grows when the offset runs away from its center of curvature and shrinks when it runs toward it.
 */
function moveAnchor(sub: SubPath, index: number, anchor: Anchor, at: Point, distance: number): Anchor {
    const n = sub.anchors.length;
    const prev = sub.closed || index > 0 ? sub.anchors[(index - 1 + n) % n] : null;
    const next = sub.closed || index < n - 1 ? sub.anchors[(index + 1) % n] : null;
    const moved: Anchor = { x: at.x, y: at.y, kind: anchor.kind };
    if (anchor.out && next) {
        const scale = curveScale(anchor, next, distance, false);
        const handle = scaledHandle(at, anchor, anchor.out, scale);
        if (handle) {
            moved.out = handle;
        }
    }
    if (anchor.in && prev) {
        const scale = curveScale(prev, anchor, distance, true);
        const handle = scaledHandle(at, anchor, anchor.in, scale);
        if (handle) {
            moved.in = handle;
        }
    }
    return moved;
}

function scaledHandle(at: Point, anchor: Anchor, handle: Point, scale: number): Point | undefined {
    const x = at.x + (handle.x - anchor.x) * scale;
    const y = at.y + (handle.y - anchor.y) * scale;
    return samePoint({ x, y }, at) ? undefined : { x, y };
}

/** How much a cubic's handles grow. 1 is a straight segment. */
function curveScale(a: Anchor, b: Anchor, distance: number, atEnd: boolean): number {
    const p0 = a;
    const p1 = a.out ?? a;
    const p2 = b.in ?? b;
    const p3 = b;
    if (samePoint(p1, p0) && samePoint(p2, p3)) {
        return 1;
    }
    const d1 = atEnd
        ? { x: 3 * (p3.x - p2.x), y: 3 * (p3.y - p2.y) }
        : { x: 3 * (p1.x - p0.x), y: 3 * (p1.y - p0.y) };
    const d2 = atEnd
        ? { x: 6 * (p3.x - 2 * p2.x + p1.x), y: 6 * (p3.y - 2 * p2.y + p1.y) }
        : { x: 6 * (p2.x - 2 * p1.x + p0.x), y: 6 * (p2.y - 2 * p1.y + p0.y) };
    const speed = Math.hypot(d1.x, d1.y);
    if (speed < 1e-8) {
        return 1;
    }
    const cross = d1.x * d2.y - d1.y * d2.x;
    const kappa = cross / (speed * speed * speed);
    if (Math.abs(kappa) < 1e-8) {
        return 1;
    }
    const radius = 1 / Math.abs(kappa);
    const grown = radius + distance * Math.sign(cross);
    if (grown <= 1e-6) {
        return 0;
    }
    return grown / radius;
}

/**
 * A circular fillet (a rounded corner between two edges) keeps its shape when inset or outset.
 * The radius grows or shrinks by the offset. At zero it collapses to the sharp corner instead of crossing.
 */
function applyFillets(original: readonly Anchor[], placed: Anchor[], distance: number, closed: boolean): void {
    const n = original.length;
    const segments = closed ? n : Math.max(0, n - 1);
    for (let i = 0; i < segments; i++) {
        const j = (i + 1) % n;
        const a = original[i];
        const b = original[j];
        if ((!a.out || samePoint(a.out, a)) && (!b.in || samePoint(b.in, b))) {
            continue;
        }
        const fillet = filletOf(a, b);
        if (!fillet) {
            continue;
        }
        const align = fillet.nA.x * fillet.outA.x + fillet.nA.y * fillet.outA.y;
        const newR = fillet.radius + distance * align;
        if (newR <= 1e-4) {
            const corner = lineHit(shift(a, fillet.nA, distance), fillet.tA, shift(b, fillet.nB, distance), fillet.tB);
            if (!corner) {
                continue;
            }
            placed[i].x = corner.x;
            placed[i].y = corner.y;
            placed[j].x = corner.x;
            placed[j].y = corner.y;
            delete placed[i].out;
            delete placed[j].in;
            continue;
        }
        const scale = newR / fillet.radius;
        const posA = {
            x: fillet.center.x + fillet.outA.x * newR,
            y: fillet.center.y + fillet.outA.y * newR,
        };
        const posB = {
            x: fillet.center.x + fillet.outB.x * newR,
            y: fillet.center.y + fillet.outB.y * newR,
        };
        placed[i].x = posA.x;
        placed[i].y = posA.y;
        placed[j].x = posB.x;
        placed[j].y = posB.y;
        if (a.out) {
            const handle = scaledHandle(posA, a, a.out, scale);
            if (handle) {
                placed[i].out = handle;
            } else {
                delete placed[i].out;
            }
        }
        if (b.in) {
            const handle = scaledHandle(posB, b, b.in, scale);
            if (handle) {
                placed[j].in = handle;
            } else {
                delete placed[j].in;
            }
        }
    }
}

type Fillet = {
    center: Point;
    radius: number;
    outA: Point;
    outB: Point;
    nA: Point;
    nB: Point;
    tA: Point;
    tB: Point;
};

/** Circular corner: both ends sit on one center, and the handles stay tangent to that circle */
function filletOf(a: Anchor, b: Anchor): Fillet | null {
    const tA = outgoingDir(a, b);
    const tB = incomingDir(a, b);
    const nA = leftOf(tA);
    const nB = leftOf(tB);
    if (!tA || !tB || !nA || !nB) {
        return null;
    }
    const towardA = centerDir(a, nA, b.in ?? b);
    const towardB = centerDir(b, nB, a.out ?? a);
    const center = lineHit(a, towardA, b, towardB);
    if (!center) {
        return null;
    }
    const ra = Math.hypot(a.x - center.x, a.y - center.y);
    const rb = Math.hypot(b.x - center.x, b.y - center.y);
    const radius = (ra + rb) / 2;
    if (!(radius > 1e-4) || radius > 1e6 || Math.abs(ra - rb) > radius * 0.08) {
        return null;
    }
    if (!tangentHandle(a, a.out, center) || !tangentHandle(b, b.in, center)) {
        return null;
    }
    return {
        center,
        radius,
        outA: { x: (a.x - center.x) / ra, y: (a.y - center.y) / ra },
        outB: { x: (b.x - center.x) / rb, y: (b.y - center.y) / rb },
        nA,
        nB,
        tA,
        tB,
    };
}

/** Unit normal that points from the anchor toward the center of the bend */
function centerDir(anchor: Point, leftNormal: Point, toward: Point): Point {
    const vx = toward.x - anchor.x;
    const vy = toward.y - anchor.y;
    const dot = vx * leftNormal.x + vy * leftNormal.y;
    return dot >= 0 ? leftNormal : { x: -leftNormal.x, y: -leftNormal.y };
}

function tangentHandle(anchor: Anchor, handle: Point | undefined, center: Point): boolean {
    if (!handle || samePoint(handle, anchor)) {
        return false;
    }
    const hx = handle.x - anchor.x;
    const hy = handle.y - anchor.y;
    const hlen = Math.hypot(hx, hy);
    const rx = anchor.x - center.x;
    const ry = anchor.y - center.y;
    const rlen = Math.hypot(rx, ry);
    if (hlen < 1e-8 || rlen < 1e-8) {
        return false;
    }
    return Math.abs((hx * rx + hy * ry) / (hlen * rlen)) < 0.2;
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
