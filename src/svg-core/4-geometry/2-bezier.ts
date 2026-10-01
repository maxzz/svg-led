import { type Point, type Rect } from "../1-model/1-types";

export type Cubic = readonly [Point, Point, Point, Point];

export function lerp(a: Point, b: Point, t: number): Point {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function distance(a: Point, b: Point): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

export function cubicPoint([p0, p1, p2, p3]: Cubic, t: number): Point {
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
}

/** de Casteljau split at t; both halves together trace exactly the original curve */
export function splitCubic([p0, p1, p2, p3]: Cubic, t: number): [Cubic, Cubic] {
    const p01 = lerp(p0, p1, t);
    const p12 = lerp(p1, p2, t);
    const p23 = lerp(p2, p3, t);
    const p012 = lerp(p01, p12, t);
    const p123 = lerp(p12, p23, t);
    const mid = lerp(p012, p123, t);
    return [
        [p0, p01, p012, mid],
        [mid, p123, p23, p3],
    ];
}

/** Exact bounding box using the roots of the derivative */
export function cubicBBox(c: Cubic): Rect {
    const ts = [0, 1, ...derivativeRoots(c[0].x, c[1].x, c[2].x, c[3].x), ...derivativeRoots(c[0].y, c[1].y, c[2].y, c[3].y)];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of ts) {
        const p = cubicPoint(c, t);
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function derivativeRoots(p0: number, p1: number, p2: number, p3: number): number[] {
    // B'(t)/3 = a*t^2 + b*t + c
    const a = -p0 + 3 * p1 - 3 * p2 + p3;
    const b = 2 * (p0 - 2 * p1 + p2);
    const c = p1 - p0;
    const rv: number[] = [];
    if (Math.abs(a) < 1e-12) {
        if (Math.abs(b) > 1e-12) {
            rv.push(-c / b);
        }
    } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const sq = Math.sqrt(disc);
            rv.push((-b + sq) / (2 * a), (-b - sq) / (2 * a));
        }
    }
    return rv.filter((t) => t > 0 && t < 1);
}

/** Closest point on the curve: coarse sampling, then local refinement */
export function nearestOnCubic(c: Cubic, p: Point): { t: number; dist: number; point: Point; } {
    const SAMPLES = 32;
    let bestT = 0;
    let bestD = Infinity;
    for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        const d = distance(cubicPoint(c, t), p);
        if (d < bestD) {
            bestD = d;
            bestT = t;
        }
    }

    let step = 1 / SAMPLES;
    while (step > 1e-5) {
        step /= 2;
        for (const t of [bestT - step, bestT + step]) {
            if (t < 0 || t > 1) {
                continue;
            }
            const d = distance(cubicPoint(c, t), p);
            if (d < bestD) {
                bestD = d;
                bestT = t;
            }
        }
    }
    return { t: bestT, dist: bestD, point: cubicPoint(c, bestT) };
}

export function nearestOnLine(a: Point, b: Point, p: Point): { t: number; dist: number; point: Point; } {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    const point = lerp(a, b, t);
    return { t, dist: distance(point, p), point };
}

/** Quadratic to cubic conversion (exact) */
export function quadToCubic(p0: Point, q: Point, p3: Point): Cubic {
    return [
        p0,
        { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) },
        { x: p3.x + (2 / 3) * (q.x - p3.x), y: p3.y + (2 / 3) * (q.y - p3.y) },
        p3,
    ];
}

/** Converts an SVG elliptical arc to cubic segments (endpoint parameterization, SVG spec F.6) */
export function arcToCubics(p0: Point, rx: number, ry: number, xAxisRotation: number, largeArc: boolean, sweep: boolean, p1: Point): Cubic[] {
    if (p0.x === p1.x && p0.y === p1.y) {
        return [];
    }
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    if (!rx || !ry) {
        return [[p0, p0, p1, p1]];
    }

    const phi = (xAxisRotation * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const dx = (p0.x - p1.x) / 2;
    const dy = (p0.y - p1.y) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;

    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
        const s = Math.sqrt(lambda);
        rx *= s;
        ry *= s;
    }

    const rx2 = rx * rx;
    const ry2 = ry * ry;
    const num = rx2 * ry2 - rx2 * y1p * y1p - ry2 * x1p * x1p;
    const den = rx2 * y1p * y1p + ry2 * x1p * x1p;
    let coef = Math.sqrt(Math.max(0, num / den));
    if (largeArc === sweep) {
        coef = -coef;
    }
    const cxp = (coef * rx * y1p) / ry;
    const cyp = (-coef * ry * x1p) / rx;

    const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

    const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dTheta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dTheta > 0) {
        dTheta -= 2 * Math.PI;
    } else if (sweep && dTheta < 0) {
        dTheta += 2 * Math.PI;
    }

    const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2) - 1e-9));
    const delta = dTheta / segments;
    const k = (4 / 3) * Math.tan(delta / 4);

    const rv: Cubic[] = [];
    let start = p0;
    let theta = theta1;
    for (let i = 0; i < segments; i++) {
        const cos1 = Math.cos(theta);
        const sin1 = Math.sin(theta);
        const theta2 = theta + delta;
        const cos2 = Math.cos(theta2);
        const sin2 = Math.sin(theta2);

        const e = (x: number, y: number): Point => ({
            x: cx + rx * x * cosPhi - ry * y * sinPhi,
            y: cy + rx * x * sinPhi + ry * y * cosPhi,
        });

        const c1 = e(cos1 - k * sin1, sin1 + k * cos1);
        const c2 = e(cos2 + k * sin2, sin2 - k * cos2);
        const end = i === segments - 1 ? p1 : e(cos2, sin2);

        rv.push([start, c1, c2, end]);
        start = end;
        theta = theta2;
    }
    return rv;
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
    const sign = ux * vy - uy * vx < 0 ? -1 : 1;
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return sign * Math.acos(Math.max(-1, Math.min(1, dot / len)));
}

/** Kappa for approximating a quarter circle with one cubic */
export const KAPPA = 0.5522847498307936;
