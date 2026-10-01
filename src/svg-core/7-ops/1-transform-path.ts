import { type Matrix, type Point } from "../1-model/1-types";
import { type PathSeg, parsePathData } from "../2-parse/2-parse-path-data";
import { applyMatrix, isAxisAligned, isSimilarity } from "../4-geometry/1-matrix";
import { arcToCubics } from "../4-geometry/2-bezier";
import { serializePathSegs } from "../3-serialize/2-serialize-path";

/**
 * Applies a matrix to path data. Arcs stay arcs when the matrix allows it
 * (similarity, or axis-aligned scale of an unrotated arc); otherwise they become cubics.
 */
export function transformPathData(d: string, m: Matrix, precision: number): string {
    return serializePathSegs(transformSegs(parsePathData(d), m), precision);
}

export function transformSegs(segs: readonly PathSeg[], m: Matrix): PathSeg[] {
    const rv: PathSeg[] = [];
    const t = (p: Point) => applyMatrix(m, p);
    const det = m[0] * m[3] - m[1] * m[2];

    let cur: Point = { x: 0, y: 0 };
    let start: Point = { x: 0, y: 0 };

    for (const s of segs) {
        switch (s.c) {
            case 'M':
                rv.push({ c: 'M', p: t(s.p) });
                cur = start = s.p;
                break;
            case 'L':
                rv.push({ c: 'L', p: t(s.p) });
                cur = s.p;
                break;
            case 'C':
                rv.push({ c: 'C', c1: t(s.c1), c2: t(s.c2), p: t(s.p) });
                cur = s.p;
                break;
            case 'Q':
                rv.push({ c: 'Q', q: t(s.q), p: t(s.p) });
                cur = s.p;
                break;
            case 'A': {
                const arc = transformArc(s, m, det);
                if (arc) {
                    rv.push(arc);
                } else {
                    for (const [, c1, c2, p] of arcToCubics(cur, s.rx, s.ry, s.rot, s.large, s.sweep, s.p)) {
                        rv.push({ c: 'C', c1: t(c1), c2: t(c2), p: t(p) });
                    }
                }
                cur = s.p;
                break;
            }
            case 'Z':
                rv.push({ c: 'Z' });
                cur = start;
                break;
        }
    }
    return rv;
}

function transformArc(s: Extract<PathSeg, { c: 'A'; }>, m: Matrix, det: number): PathSeg | undefined {
    const sweep = det < 0 ? !s.sweep : s.sweep;
    const p = applyMatrix(m, s.p);

    if (isSimilarity(m)) {
        const scale = Math.sqrt(Math.abs(det));
        const angle = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
        const rot = det < 0 ? -s.rot + angle : s.rot + angle;
        return { c: 'A', rx: s.rx * scale, ry: s.ry * scale, rot: normalizeDegrees(rot), large: s.large, sweep, p };
    }

    if (isAxisAligned(m)) {
        const r = normalizeDegrees(s.rot);
        if (r % 180 === 0) {
            return { c: 'A', rx: s.rx * Math.abs(m[0]), ry: s.ry * Math.abs(m[3]), rot: 0, large: s.large, sweep, p };
        }
        if (r % 90 === 0) {
            return { c: 'A', rx: s.rx * Math.abs(m[3]), ry: s.ry * Math.abs(m[0]), rot: r, large: s.large, sweep, p };
        }
    }
}

function normalizeDegrees(deg: number): number {
    const r = ((deg % 360) + 360) % 360;
    return Math.abs(r - Math.round(r)) < 1e-9 ? Math.round(r) : r;
}
