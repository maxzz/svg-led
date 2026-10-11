import { type Anchor, type Matrix, type Point, type SubPath } from "../1-model/1-types";
import { applyMatrix } from "../4-geometry/1-matrix";
import { type Cubic, distance, lerp, nearestOnCubic, nearestOnLine, splitCubic } from "../4-geometry/2-bezier";
import { inferAnchorKind, samePoint } from "./1-path-anchors";

//---------------------------------------------------------------------------

/** Anchor address inside a path: "subpathIndex:anchorIndex" */
export type AnchorKey = `${number}:${number}`;

export function anchorKey(si: number, ai: number): AnchorKey {
    return `${si}:${ai}`;
}

export function parseAnchorKey(key: string): [si: number, ai: number] {
    const [si, ai] = key.split(':').map(Number);
    return [si, ai];
}

export function getAnchor(subpaths: readonly SubPath[], key: string): Anchor | undefined {
    const [si, ai] = parseAnchorKey(key);
    return subpaths[si]?.anchors[ai];
}

export function allAnchorKeys(subpaths: readonly SubPath[]): AnchorKey[] {
    const rv: AnchorKey[] = [];
    subpaths.forEach((s, si) => s.anchors.forEach((_, ai) => rv.push(anchorKey(si, ai))));
    return rv;
}

export function moveAnchor(a: Anchor, dx: number, dy: number): void {
    a.x += dx;
    a.y += dy;
    if (a.in) {
        a.in = { x: a.in.x + dx, y: a.in.y + dy };
    }
    if (a.out) {
        a.out = { x: a.out.x + dx, y: a.out.y + dy };
    }
}

//---------------------------------------------------------------------------

export type HandleSide = 'in' | 'out';

/**
 * Drags one direction handle.
 * A smooth anchor keeps the opposite handle on the same line with its own length (Illustrator behavior);
 * `breakSmooth` (Alt) lets the handle move alone and turns the anchor into a cusp.
 */
export function setHandle(a: Anchor, side: HandleSide, pos: Point, breakSmooth: boolean): void {
    a[side] = { ...pos };
    const other: HandleSide = side === 'in' ? 'out' : 'in';
    const otherHandle = a[other];

    if (breakSmooth) {
        a.kind = otherHandle ? 'cusp' : inferAnchorKind(a);
        return;
    }

    if (a.kind === 'smooth' && otherHandle) {
        const len = distance(a, otherHandle);
        const dx = a.x - pos.x;
        const dy = a.y - pos.y;
        const dl = Math.hypot(dx, dy);
        if (dl) {
            a[other] = { x: a.x + (dx / dl) * len, y: a.y + (dy / dl) * len };
        }
    }
}

/** Pulls symmetric handles out of an anchor: `out` follows the pointer, `in` mirrors it (pen drag, Alt+drag on a corner) */
export function pullHandles(a: Anchor, pos: Point): void {
    if (samePoint(a, pos)) {
        delete a.in;
        delete a.out;
        a.kind = 'corner';
        return;
    }
    a.out = { ...pos };
    a.in = { x: 2 * a.x - pos.x, y: 2 * a.y - pos.y };
    a.kind = 'smooth';
}

/** Alt+click: corner <-> smooth. A smooth anchor gets handles along the direction of its neighbors. */
export function toggleAnchorKind(sub: SubPath, ai: number): void {
    const a = sub.anchors[ai];
    if (a.in || a.out) {
        delete a.in;
        delete a.out;
        a.kind = 'corner';
        return;
    }

    const n = sub.anchors.length;
    const prev = ai > 0 ? sub.anchors[ai - 1] : sub.closed ? sub.anchors[n - 1] : undefined;
    const next = ai < n - 1 ? sub.anchors[ai + 1] : sub.closed ? sub.anchors[0] : undefined;
    if (!prev && !next) {
        return;
    }

    const from = prev ?? a;
    const to = next ?? a;
    let dx = to.x - from.x;
    let dy = to.y - from.y;
    const dl = Math.hypot(dx, dy);
    if (!dl) {
        return;
    }
    dx /= dl;
    dy /= dl;

    const lenIn = prev ? distance(prev, a) / 3 : distance(a, to) / 3;
    const lenOut = next ? distance(a, next) / 3 : distance(from, a) / 3;
    a.in = { x: a.x - dx * lenIn, y: a.y - dy * lenIn };
    a.out = { x: a.x + dx * lenOut, y: a.y + dy * lenOut };
    a.kind = 'smooth';
}

/** Removes anchors; subpaths left with fewer than two anchors are removed */
export function deleteAnchors(subpaths: readonly SubPath[], keys: ReadonlySet<string>): SubPath[] {
    const rv: SubPath[] = [];
    subpaths.forEach(
        (s, si) => {
            const anchors = s.anchors.filter((_, ai) => !keys.has(anchorKey(si, ai)));
            if (anchors.length >= 2) {
                rv.push({ anchors, closed: s.closed });
            }
        }
    );
    return rv;
}

//---------------------------------------------------------------------------

export function segmentCount(sub: SubPath): number {
    const n = sub.anchors.length;
    return sub.closed ? n : Math.max(0, n - 1);
}

export function segmentEnds(sub: SubPath, seg: number): [Anchor, Anchor] {
    const a = sub.anchors[seg];
    const b = sub.anchors[(seg + 1) % sub.anchors.length];
    return [a, b];
}

export function segmentCubic(a: Anchor, b: Anchor): Cubic | null {
    if (!a.out && !b.in) {
        return null;
    }
    return [{ x: a.x, y: a.y }, a.out ?? { x: a.x, y: a.y }, b.in ?? { x: b.x, y: b.y }, { x: b.x, y: b.y }];
}

export type SegmentHit = { si: number; seg: number; t: number; dist: number; point: Point; };

export function nearestSegment(subpaths: readonly SubPath[], p: Point): SegmentHit | undefined {
    let best: SegmentHit | undefined;
    subpaths.forEach(
        (sub, si) => {
            const count = segmentCount(sub);
            for (let seg = 0; seg < count; seg++) {
                const [a, b] = segmentEnds(sub, seg);
                const c = segmentCubic(a, b);
                const hit = c ? nearestOnCubic(c, p) : nearestOnLine(a, b, p);
                if (!best || hit.dist < best.dist) {
                    best = { si, seg, ...hit };
                }
            }
        }
    );
    return best;
}

//---------------------------------------------------------------------------

/**
 * Inserts an anchor on a segment without changing the shape (de Casteljau split for curves).
 * Returns the key of the new anchor.
 */
export function insertAnchor(subpaths: SubPath[], si: number, seg: number, t: number): AnchorKey {
    const sub = subpaths[si];
    const [a, b] = segmentEnds(sub, seg);
    const c = segmentCubic(a, b);

    let anchor: Anchor;
    if (!c) {
        const p = lerp(a, b, t);
        anchor = { x: p.x, y: p.y, kind: 'corner' };
    } else {
        const [left, right] = splitCubic(c, t);
        a.out = normalizeHandle(left[1], a);
        b.in = normalizeHandle(right[2], b);
        anchor = { x: left[3].x, y: left[3].y, in: { ...left[2] }, out: { ...right[1] }, kind: 'smooth' };
        a.kind = inferAnchorKind(a);
        b.kind = inferAnchorKind(b);
    }

    const at = seg + 1;
    sub.anchors.splice(at, 0, anchor);
    return anchorKey(si, at);
}

function normalizeHandle(h: Point, a: Point): Point | undefined {
    return samePoint(h, a) ? undefined : { x: h.x, y: h.y };
}

export function transformSubpaths(subpaths: SubPath[], m: Matrix): void {
    for (const s of subpaths) {
        for (const a of s.anchors) {
            const p = applyMatrix(m, a);
            a.x = p.x;
            a.y = p.y;
            if (a.in) {
                a.in = applyMatrix(m, a.in);
            }
            if (a.out) {
                a.out = applyMatrix(m, a.out);
            }
        }
    }
}

/** Snaps `p` to the closest 45 degree direction from `origin` (Shift while dragging) */
export function constrain45(origin: Point, p: Point): Point {
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    const len = Math.hypot(dx, dy);
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: origin.x + Math.cos(angle) * len, y: origin.y + Math.sin(angle) * len };
}
