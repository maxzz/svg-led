import { type Matrix, type Point } from "../1-model/1-types";

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m1 * m2: applies m2 first, then m1 (same order as nested SVG transforms) */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;
    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    ];
}

export function invert(m: Matrix): Matrix {
    const [a, b, c, d, e, f] = m;
    const det = a * d - b * c;
    if (!det) {
        return IDENTITY;
    }
    return [
        d / det,
        -b / det,
        -c / det,
        a / det,
        (c * f - d * e) / det,
        (b * e - a * f) / det,
    ];
}

export function applyMatrix(m: Matrix, p: Point): Point {
    return {
        x: m[0] * p.x + m[2] * p.y + m[4],
        y: m[1] * p.x + m[3] * p.y + m[5],
    };
}

/** Applies only the linear part (for vectors, not points) */
export function applyToVector(m: Matrix, v: Point): Point {
    return {
        x: m[0] * v.x + m[2] * v.y,
        y: m[1] * v.x + m[3] * v.y,
    };
}

export function translateMatrix(tx: number, ty: number): Matrix {
    return [1, 0, 0, 1, tx, ty];
}

export function scaleMatrix(sx: number, sy: number = sx): Matrix {
    return [sx, 0, 0, sy, 0, 0];
}

/** Scale around an origin point */
export function scaleAround(sx: number, sy: number, origin: Point): Matrix {
    return [sx, 0, 0, sy, origin.x - sx * origin.x, origin.y - sy * origin.y];
}

export function rotateMatrix(degrees: number, cx = 0, cy = 0): Matrix {
    const r = (degrees * Math.PI) / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const rot: Matrix = [cos, sin, -sin, cos, 0, 0];
    if (!cx && !cy) {
        return rot;
    }
    return multiply(translateMatrix(cx, cy), multiply(rot, translateMatrix(-cx, -cy)));
}

export function isIdentity(m: Matrix, eps = 1e-12): boolean {
    return m.every((v, i) => Math.abs(v - IDENTITY[i]) < eps);
}

/** No rotation or skew: only scale and translate */
export function isAxisAligned(m: Matrix, eps = 1e-9): boolean {
    return Math.abs(m[1]) < eps && Math.abs(m[2]) < eps;
}

/** Rotation, uniform scale, reflection and translation only (keeps circles circular) */
export function isSimilarity(m: Matrix, eps = 1e-9): boolean {
    const [a, b, c, d] = m;
    const rotOrRefl = (Math.abs(a - d) < eps && Math.abs(b + c) < eps) || (Math.abs(a + d) < eps && Math.abs(b - c) < eps);
    return rotOrRefl;
}

/** Average scale factor (for converting screen tolerances into local units) */
export function matrixScale(m: Matrix): number {
    return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
}

export function matrixToString(m: Matrix, fmt: (n: number) => string): string {
    if (isAxisAligned(m) && m[0] === 1 && m[3] === 1) {
        return `translate(${fmt(m[4])} ${fmt(m[5])})`;
    }
    return `matrix(${m.map(fmt).join(' ')})`;
}
