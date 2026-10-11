import { type Anchor, type AnchorKind, type Point, type SubPath } from "../1-model/1-types";
import { type PathSeg, parsePathData } from "../2-parse/2-parse-path-data";
import { arcToCubics, quadToCubic } from "../4-geometry/2-bezier";
import { makeFmt } from "../3-serialize/1-format";

/**
 * Illustrator anchors <-> SVG path data.
 * - A segment is a straight line (L) when the facing handles of both its anchors are absent,
 *   otherwise a cubic (C) where a missing handle equals its anchor point.
 * - Q, T, S and A are converted to cubics; a closing point that repeats the start point is merged into it.
 */
export function segsToSubpaths(segs: readonly PathSeg[]): SubPath[] {
    const rv: SubPath[] = [];
    let sub: SubPath | null = null;
    let cur: Point = { x: 0, y: 0 };
    let start: Point = { x: 0, y: 0 };

    function ensureSub(): SubPath {
        if (!sub) {
            sub = { anchors: [{ x: start.x, y: start.y, kind: 'corner' }], closed: false };
            rv.push(sub);
        }
        return sub;
    }

    function cubicTo(c1: Point, c2: Point, p: Point) {
        const s = ensureSub();
        const prev = s.anchors[s.anchors.length - 1];
        if (!samePoint(c1, prev)) {
            prev.out = { ...c1 };
        }
        const a: Anchor = { x: p.x, y: p.y, kind: 'corner' };
        if (!samePoint(c2, p)) {
            a.in = { ...c2 };
        }
        s.anchors.push(a);
        cur = p;
    }

    for (const seg of segs) {
        switch (seg.c) {
            case 'M':
                sub = { anchors: [{ x: seg.p.x, y: seg.p.y, kind: 'corner' }], closed: false };
                rv.push(sub);
                cur = start = seg.p;
                break;
            case 'L':
                ensureSub().anchors.push({ x: seg.p.x, y: seg.p.y, kind: 'corner' });
                cur = seg.p;
                break;
            case 'C':
                cubicTo(seg.c1, seg.c2, seg.p);
                break;
            case 'Q': {
                const [, c1, c2] = quadToCubic(cur, seg.q, seg.p);
                cubicTo(c1, c2, seg.p);
                break;
            }
            case 'A': {
                for (const [, c1, c2, p] of arcToCubics(cur, seg.rx, seg.ry, seg.rot, seg.large, seg.sweep, seg.p)) {
                    cubicTo(c1, c2, p);
                }
                cur = seg.p;
                break;
            }
            case 'Z': {
                const s = sub as SubPath | null;
                if (s) {
                    s.closed = true;
                    mergeClosingAnchor(s);
                }
                sub = null;
                cur = start;
                break;
            }
        }
    }

    for (const s of rv) {
        for (const a of s.anchors) {
            a.kind = inferAnchorKind(a);
        }
    }
    return rv;
}

function mergeClosingAnchor(sub: SubPath): void {
    const n = sub.anchors.length;
    if (n < 2) {
        return;
    }
    const first = sub.anchors[0];
    const last = sub.anchors[n - 1];
    if (samePoint(first, last)) {
        if (last.in) {
            first.in = last.in;
        }
        sub.anchors.pop();
    }
}

export function inferAnchorKind(a: Anchor): AnchorKind {
    if (!a.in && !a.out) {
        return 'corner';
    }
    if (a.in && a.out) {
        const v1x = a.in.x - a.x, v1y = a.in.y - a.y;
        const v2x = a.out.x - a.x, v2y = a.out.y - a.y;
        const l1 = Math.hypot(v1x, v1y);
        const l2 = Math.hypot(v2x, v2y);
        if (l1 && l2) {
            const cross = (v1x * v2y - v1y * v2x) / (l1 * l2);
            const dot = v1x * v2x + v1y * v2y;
            if (Math.abs(cross) < 0.01 && dot < 0) {
                return 'smooth';
            }
        }
    }
    return 'cusp';
}

export function subpathsToPathData(subpaths: readonly SubPath[], precision: number): string {
    const f = makeFmt(precision);
    const pt = (p: Point) => `${f(p.x)} ${f(p.y)}`;
    const parts: string[] = [];

    const segment = (a: Anchor, b: Anchor) => {
        if (!a.out && !b.in) {
            parts.push(`L${pt(b)}`);
        } else {
            parts.push(`C${pt(a.out ?? a)} ${pt(b.in ?? b)} ${pt(b)}`);
        }
    };

    for (const sub of subpaths) {
        const list = sub.anchors;
        if (!list.length) {
            continue;
        }
        parts.push(`M${pt(list[0])}`);
        for (let i = 1; i < list.length; i++) {
            segment(list[i - 1], list[i]);
        }
        if (sub.closed && list.length > 1) {
            const last = list[list.length - 1];
            const first = list[0];
            if (last.out || first.in) {
                segment(last, first); // a straight closing segment is drawn by Z itself
            }
            parts.push('Z');
        }
    }
    return parts.join(' ');
}

const cache = new Map<string, SubPath[]>();
const CACHE_LIMIT = 300;

/** Anchors of path data; the result is a fresh copy that callers may mutate */
export function pathDataToSubpaths(d: string): SubPath[] {
    let rv = cache.get(d);
    if (!rv) {
        rv = segsToSubpaths(parsePathData(d));
        if (cache.size >= CACHE_LIMIT) {
            cache.delete(cache.keys().next().value!);
        }
        cache.set(d, rv);
    }
    return structuredClone(rv);
}

export function samePoint(a: Point, b: Point, eps = 1e-9): boolean {
    return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}
