import { type Matrix, type Rect, type ViewBox } from "../1-model/1-types";

export type Padding = { top: number; right: number; bottom: number; left: number; };

export function uniformPadding(n: number): Padding {
    return { top: n, right: n, bottom: n, left: n };
}

export type FitOptions = {
    padding: Padding;
    keepAspect: boolean;         // uniform scale
    center: boolean;             // center inside the padded box; otherwise align to its top-left
};

/** Matrix (document coordinates) that scales and moves `src` into `box` minus padding */
export function fitRectMatrix(src: Rect, box: Rect, options: FitOptions): Matrix {
    const { padding, keepAspect, center } = options;
    const inner: Rect = {
        x: box.x + padding.left,
        y: box.y + padding.top,
        width: Math.max(1e-9, box.width - padding.left - padding.right),
        height: Math.max(1e-9, box.height - padding.top - padding.bottom),
    };

    let sx = src.width ? inner.width / src.width : 1;
    let sy = src.height ? inner.height / src.height : 1;
    if (!src.width) sx = sy;
    if (!src.height) sy = sx;
    if (keepAspect) {
        sx = sy = Math.min(sx, sy);
    }

    const w = src.width * sx;
    const h = src.height * sy;
    const ox = center ? inner.x + (inner.width - w) / 2 : inner.x;
    const oy = center ? inner.y + (inner.height - h) / 2 : inner.y;

    return [sx, 0, 0, sy, ox - src.x * sx, oy - src.y * sy];
}

/** ViewBox that wraps `rect` with the given padding */
export function viewBoxAround(rect: Rect, padding: Padding): ViewBox {
    return {
        x: rect.x - padding.left,
        y: rect.y - padding.top,
        width: Math.max(1e-6, rect.width + padding.left + padding.right),
        height: Math.max(1e-6, rect.height + padding.top + padding.bottom),
    };
}
