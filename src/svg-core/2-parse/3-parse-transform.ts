import { type Matrix } from "../1-model/1-types";
import { IDENTITY, multiply, rotateMatrix } from "../4-geometry/1-matrix";

/** Parses an SVG transform attribute into a single matrix; unknown parts are ignored */
export function parseTransform(text: string): Matrix {
    let m: Matrix = IDENTITY;
    FN_RE.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = FN_RE.exec(text))) {
        const fn = match[1];
        const a = match[2].split(/[\s,]+/).filter(Boolean).map(Number);
        m = multiply(m, fnMatrix(fn, a));
    }
    
    return m;
}

const FN_RE = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;

function fnMatrix(fn: string, a: number[]): Matrix {
    switch (fn) {
        case 'matrix':
            return a.length === 6 ? [a[0], a[1], a[2], a[3], a[4], a[5]] : IDENTITY;
        case 'translate':
            return [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        case 'scale':
            return [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        case 'rotate':
            return rotateMatrix(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
        case 'skewX':
            return [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        case 'skewY':
            return [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    }
    return IDENTITY;
}
