import { type Anchor, type Point, type SubPath } from "../1-model/1-types";
import { inferAnchorKind } from "../5-anchors/1-path-anchors";

/**
 * Fits Bezier curves to a dense closed polyline, such as an offset or a boolean result.
 *
 * Sharp turns stay corners. A long edge stays a straight line, and a curve that meets it
 * smoothly keeps the line's direction. Everything else is fitted with as
 * few cubics as the tolerance allows (Schneider, "An Algorithm for Automatically Fitting
 * Digitized Curves", Graphics Gems, 1990).
 */

type Seg = { p0: Point; c1?: Point; c2?: Point; p3: Point; };

/** Turn sharper than this (radians) is always a corner */
const CORNER_TURN = 0.45;

/**
 * Closed polyline as one closed subpath.
 * `tol` is the largest distance the curves may stray from the points. An edge longer than
 * `minLine` stays a straight line, so the polyline's curved parts must use shorter edges.
 */
export function fitClosedPolyline(input: readonly Point[], tol: number, minLine: number): SubPath | null {
    const pts = cleanRing(input, tol * 0.25);
    const n = pts.length;
    if (n < 3) {
        return null;
    }

    const lens = pts.map((p, i) => dist(p, pts[(i + 1) % n]));
    const corner = pts.map((p, i) => {
        const prev = pts[(i - 1 + n) % n];
        const next = pts[(i + 1) % n];
        return turnAngle(prev, p, next) > CORNER_TURN || lineDist(p, prev, next) > tol * 6;
    });
    const long = lens.map((len) => len > minLine);
    const isBreak = (i: number) => corner[i] || long[i] || long[(i - 1 + n) % n];

    const breaks: number[] = [];
    for (let i = 0; i < n; i++) {
        if (isBreak(i)) {
            breaks.push(i);
        }
    }

    const segs: Seg[] = [];
    if (!breaks.length) {
        fitLoop(pts, tol, segs);
    } else {
        for (let k = 0; k < breaks.length; k++) {
            const from = breaks[k];
            const to = k + 1 < breaks.length ? breaks[k + 1] : breaks[0] + n;
            const run: Point[] = [];
            for (let i = from; i <= to; i++) {
                run.push(pts[i % n]);
            }
            const startTangent = !corner[from] && long[(from - 1 + n) % n] ? unit(sub(pts[from], pts[(from - 1 + n) % n])) : null;
            const endIdx = to % n;
            const endTangent = !corner[endIdx] && long[endIdx] ? unit(sub(pts[endIdx], pts[(endIdx + 1) % n])) : null;
            fitRun(run, startTangent, endTangent, tol, segs);
        }
    }

    const merged = mergeLines(segs, tol);
    if (merged.length < 2 && !merged.some((s) => s.c1)) {
        return null;
    }
    return { closed: true, anchors: toAnchors(merged) };
}

//---------------------------------------------------------------------------
// Runs

/** A run between two breaks: a straight line when it is one, otherwise cubics */
function fitRun(run: Point[], t1: Point | null, t2: Point | null, tol: number, out: Seg[]): void {
    const a = run[0];
    const b = run[run.length - 1];
    if (run.length === 2 || run.every((p) => lineDist(p, a, b) <= tol * 0.5)) {
        out.push({ p0: a, p3: b });
        return;
    }
    const pieces: Piece[] = [];
    fitCubic(run, 0, run.length - 1, t1 ?? startTangent(run), t2 ?? endTangent(run), tol, pieces);
    out.push(...mergePieces(run, pieces, tol));
}

/** A smooth loop with no corner: split at the point farthest from the start so neither half closes on itself */
function fitLoop(pts: Point[], tol: number, out: Seg[]): void {
    const n = pts.length;
    let far = 1;
    for (let i = 2; i < n; i++) {
        if (dist(pts[i], pts[0]) > dist(pts[far], pts[0])) {
            far = i;
        }
    }
    const ring = [...pts, pts[0]];
    const t0 = centerTangent(pts, 0);
    const tf = centerTangent(pts, far);
    const pieces: Piece[] = [];
    fitCubic(ring, 0, far, t0, neg(tf), tol, pieces);
    fitCubic(ring, far, n, tf, neg(t0), tol, pieces);
    out.push(...mergePieces(ring, pieces, tol));
}

function mergeLines(segs: Seg[], tol: number): Seg[] {
    const out: Seg[] = [];
    for (const seg of segs) {
        const prev = out[out.length - 1];
        if (prev && !prev.c1 && !seg.c1 && lineDist(prev.p3, prev.p0, seg.p3) <= tol * 0.25 && dot(sub(prev.p3, prev.p0), sub(seg.p3, seg.p0)) > 0) {
            prev.p3 = seg.p3;
            continue;
        }
        out.push({ ...seg });
    }
    if (out.length > 2) {
        const first = out[0];
        const last = out[out.length - 1];
        if (!first.c1 && !last.c1 && lineDist(first.p0, last.p0, first.p3) <= tol * 0.25 && dot(sub(first.p0, last.p0), sub(first.p3, first.p0)) > 0) {
            first.p0 = last.p0;
            out.pop();
        }
    }
    return out;
}

function toAnchors(segs: readonly Seg[]): Anchor[] {
    return segs.map((seg, i) => {
        const prev = segs[(i - 1 + segs.length) % segs.length];
        const anchor: Anchor = { x: seg.p0.x, y: seg.p0.y, kind: 'corner' };
        if (prev.c2) {
            anchor.in = prev.c2;
        }
        if (seg.c1) {
            anchor.out = seg.c1;
        }
        anchor.kind = inferAnchorKind(anchor);
        return anchor;
    });
}

//---------------------------------------------------------------------------
// Schneider fitting. `t1` points from the first point into the curve, `t2` from the last point back into it.

type Piece = { first: number; last: number; t1: Point; t2: Point; seg: Seg; };

/**
 * As few cubics as the tolerance allows. The count comes from a greedy pass; the same count of
 * equally long pieces is preferred when it fits, so a symmetric curve gets symmetric anchors.
 */
function fitCubic(pts: readonly Point[], first: number, last: number, t1: Point, t2: Point, tol: number, out: Piece[]): void {
    const greedy: Piece[] = [];
    fitGreedy(pts, first, last, t1, t2, tol, greedy);
    out.push(...(greedy.length > 1 ? fitEqual(pts, first, last, t1, t2, tol, greedy.length) ?? greedy : greedy));
}

function fitEqual(pts: readonly Point[], first: number, last: number, t1: Point, t2: Point, tol: number, count: number): Piece[] | null {
    const along = [0];
    for (let i = first + 1; i <= last; i++) {
        along.push(along[along.length - 1] + dist(pts[i], pts[i - 1]));
    }
    const total = along[along.length - 1];
    const cuts = [first];
    for (let k = 1; k < count; k++) {
        const target = (total * k) / count;
        let i = cuts[cuts.length - 1] + 1;
        while (i < last && along[i - first] < target) {
            i++;
        }
        if (i > first + 1 && target - along[i - 1 - first] < along[i - first] - target) {
            i--;
        }
        if (i <= cuts[cuts.length - 1] || i >= last) {
            return null;
        }
        cuts.push(i);
    }
    cuts.push(last);

    const pieces: Piece[] = [];
    let tStart = t1;
    for (let k = 0; k + 1 < cuts.length; k++) {
        const a = cuts[k];
        const b = cuts[k + 1];
        const tEnd = b === last ? t2 : neg(centerTangent(pts, b));
        const { seg } = fitOne(pts, a, b, tStart, tEnd, tol);
        if (!seg) {
            return null;
        }
        pieces.push({ first: a, last: b, t1: tStart, t2: tEnd, seg });
        tStart = neg(tEnd);
    }
    return pieces;
}

/** Each cubic reaches as far along the points as the tolerance allows (found by bisection) */
function fitGreedy(pts: readonly Point[], first: number, last: number, t1: Point, t2: Point, tol: number, out: Piece[]): void {
    let start = first;
    let tStart = t1;
    while (start < last) {
        const whole = fitOne(pts, start, last, tStart, t2, tol);
        if (whole.seg) {
            out.push({ first: start, last, t1: tStart, t2, seg: whole.seg });
            return;
        }
        let lo = start + 1;
        let hi = last - 1;
        let best = lo;
        let bestTangent = centerTangent(pts, lo);
        let bestSeg = fitOne(pts, start, lo, tStart, neg(bestTangent), tol).seg!;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            const tangent = centerTangent(pts, mid);
            const { seg } = fitOne(pts, start, mid, tStart, neg(tangent), tol);
            if (seg) {
                lo = mid;
                best = mid;
                bestTangent = tangent;
                bestSeg = seg;
            } else {
                hi = mid - 1;
            }
        }
        out.push({ first: start, last: best, t1: tStart, t2: neg(bestTangent), seg: bestSeg });
        start = best;
        tStart = bestTangent;
    }
}

/** Splitting at the worst point leaves more pieces than needed; join neighbors while one cubic still fits both */
function mergePieces(pts: readonly Point[], pieces: Piece[], tol: number): Seg[] {
    let merged = true;
    while (merged && pieces.length > 1) {
        merged = false;
        for (let i = 0; i + 1 < pieces.length; i++) {
            const a = pieces[i];
            const b = pieces[i + 1];
            const { seg } = fitOne(pts, a.first, b.last, a.t1, b.t2, tol);
            if (seg) {
                pieces.splice(i, 2, { first: a.first, last: b.last, t1: a.t1, t2: b.t2, seg });
                merged = true;
            }
        }
    }
    return pieces.map((piece) => piece.seg);
}

/** One cubic through the points within `tol`, if there is one */
function fitOne(pts: readonly Point[], first: number, last: number, t1: Point, t2: Point, tol: number): { seg?: Seg; } {
    const p0 = pts[first];
    const p3 = pts[last];
    if (last - first === 1) {
        const d = dist(p0, p3) / 3;
        return { seg: { p0, c1: add(p0, scale(t1, d)), c2: add(p3, scale(t2, d)), p3 } };
    }
    if (dist(p0, p3) < 1e-9) {
        return {};
    }

    const errSq = tol * tol;
    let u = chordParams(pts, first, last);
    let bez = generateBezier(pts, first, last, u, t1, t2);
    let max = maxError(pts, first, last, bez, u);
    for (let i = 0; i < 24 && max >= errSq; i++) {
        const uPrime = reparameterize(pts, first, last, u, bez);
        if (uPrime.some((t, k) => k > 0 && t < uPrime[k - 1])) {
            break;
        }
        const next = generateBezier(pts, first, last, uPrime, t1, t2);
        const nextMax = maxError(pts, first, last, next, uPrime);
        if (nextMax > max * 0.999 && i > 3) {
            break;
        }
        bez = next;
        max = nextMax;
        u = uPrime;
    }
    return max < errSq ? { seg: bez } : {};
}

function generateBezier(pts: readonly Point[], first: number, last: number, u: readonly number[], t1: Point, t2: Point): Seg {
    const p0 = pts[first];
    const p3 = pts[last];
    let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
    for (let i = 0; i < u.length; i++) {
        const t = u[i];
        const mt = 1 - t;
        const b0 = mt * mt * mt, b1 = 3 * t * mt * mt, b2 = 3 * t * t * mt, b3 = t * t * t;
        const a0 = scale(t1, b1);
        const a1 = scale(t2, b2);
        c00 += dot(a0, a0);
        c01 += dot(a0, a1);
        c11 += dot(a1, a1);
        const p = pts[first + i];
        const tmp = {
            x: p.x - (p0.x * (b0 + b1) + p3.x * (b2 + b3)),
            y: p.y - (p0.y * (b0 + b1) + p3.y * (b2 + b3)),
        };
        x0 += dot(a0, tmp);
        x1 += dot(a1, tmp);
    }
    const det = c00 * c11 - c01 * c01;
    let alphaL = Math.abs(det) > 1e-12 ? (x0 * c11 - x1 * c01) / det : 0;
    let alphaR = Math.abs(det) > 1e-12 ? (c00 * x1 - c01 * x0) / det : 0;
    const segLen = dist(p0, p3);
    const eps = 1e-6 * segLen;
    if (alphaL < eps || alphaR < eps || alphaL > segLen * 2 || alphaR > segLen * 2) {
        alphaL = alphaR = segLen / 3;
    }
    return { p0, c1: add(p0, scale(t1, alphaL)), c2: add(p3, scale(t2, alphaR)), p3 };
}

function maxError(pts: readonly Point[], first: number, last: number, bez: Seg, u: readonly number[]): number {
    let max = 0;
    for (let i = first + 1; i < last; i++) {
        max = Math.max(max, distSq(bezierAt(bez, u[i - first]), pts[i]));
    }
    return max;
}

function reparameterize(pts: readonly Point[], first: number, last: number, u: readonly number[], bez: Seg): number[] {
    return u.map((t, i) => newtonRoot(bez, pts[first + i], t));
}

function newtonRoot(bez: Seg, p: Point, t: number): number {
    const q = bezierAt(bez, t);
    const [d1, d2] = derivatives(bez, t);
    const diff = sub(q, p);
    const denom = dot(d1, d1) + dot(diff, d2);
    if (Math.abs(denom) < 1e-12) {
        return t;
    }
    return Math.min(1, Math.max(0, t - dot(diff, d1) / denom));
}

function chordParams(pts: readonly Point[], first: number, last: number): number[] {
    const u = [0];
    for (let i = first + 1; i <= last; i++) {
        u.push(u[u.length - 1] + dist(pts[i], pts[i - 1]));
    }
    const total = u[u.length - 1] || 1;
    return u.map((v) => v / total);
}

function bezierAt(b: Seg, t: number): Point {
    const c1 = b.c1 ?? b.p0;
    const c2 = b.c2 ?? b.p3;
    const mt = 1 - t;
    const k0 = mt * mt * mt, k1 = 3 * mt * mt * t, k2 = 3 * mt * t * t, k3 = t * t * t;
    return {
        x: b.p0.x * k0 + c1.x * k1 + c2.x * k2 + b.p3.x * k3,
        y: b.p0.y * k0 + c1.y * k1 + c2.y * k2 + b.p3.y * k3,
    };
}

function derivatives(b: Seg, t: number): [Point, Point] {
    const c1 = b.c1 ?? b.p0;
    const c2 = b.c2 ?? b.p3;
    const q0 = scale(sub(c1, b.p0), 3);
    const q1 = scale(sub(c2, c1), 3);
    const q2 = scale(sub(b.p3, c2), 3);
    const mt = 1 - t;
    const d1 = add(add(scale(q0, mt * mt), scale(q1, 2 * mt * t)), scale(q2, t * t));
    const d2 = add(scale(sub(q1, q0), 2 * mt), scale(sub(q2, q1), 2 * t));
    return [d1, d2];
}

//---------------------------------------------------------------------------
// Tangents from three neighboring points: the derivative of the parabola through them.

function startTangent(run: readonly Point[]): Point {
    const [p0, p1, p2] = run;
    const chord = unit(sub(p1, p0));
    const a = dist(p0, p1);
    const b = dist(p1, p2);
    if (a < 1e-12 || b < 1e-12) {
        return chord;
    }
    const t = unit(add(add(scale(p0, -(2 * a + b) / (a * (a + b))), scale(p1, (a + b) / (a * b))), scale(p2, -a / (b * (a + b)))));
    return dot(t, chord) > 0.5 ? t : chord;
}

function endTangent(run: readonly Point[]): Point {
    return startTangent([run[run.length - 1], run[run.length - 2], run[run.length - 3]]);
}

/** Forward unit tangent at an inner point; the points before and after it may wrap around */
function centerTangent(pts: readonly Point[], i: number): Point {
    const n = pts.length;
    const prev = pts[(i - 1 + n) % n];
    const p = pts[i % n];
    const next = pts[(i + 1) % n];
    const a = dist(prev, p);
    const b = dist(p, next);
    if (a < 1e-12 || b < 1e-12) {
        return unit(sub(next, prev));
    }
    const t = add(add(scale(prev, -b / (a * (a + b))), scale(p, (b - a) / (a * b))), scale(next, a / (b * (a + b))));
    return unit(t);
}

//---------------------------------------------------------------------------

/** Drops points closer than `minGap` to the one before, and a last point that repeats the first */
function cleanRing(pts: readonly Point[], minGap: number): Point[] {
    const out: Point[] = [];
    for (const p of pts) {
        if (!out.length || dist(out[out.length - 1], p) > minGap) {
            out.push({ x: p.x, y: p.y });
        }
    }
    while (out.length > 1 && dist(out[0], out[out.length - 1]) <= minGap) {
        out.pop();
    }
    return out;
}

function turnAngle(prev: Point, p: Point, next: Point): number {
    const u = sub(p, prev);
    const v = sub(next, p);
    return Math.abs(Math.atan2(u.x * v.y - u.y * v.x, dot(u, v)));
}

function lineDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) {
        return dist(p, a);
    }
    return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
}

function add(a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Point, b: Point): Point {
    return { x: a.x - b.x, y: a.y - b.y };
}

function scale(a: Point, k: number): Point {
    return { x: a.x * k, y: a.y * k };
}

function neg(a: Point): Point {
    return { x: -a.x, y: -a.y };
}

function dot(a: Point, b: Point): number {
    return a.x * b.x + a.y * b.y;
}

function dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function distSq(a: Point, b: Point): number {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function unit(a: Point): Point {
    const len = Math.hypot(a.x, a.y);
    return len < 1e-12 ? { x: 1, y: 0 } : { x: a.x / len, y: a.y / len };
}
