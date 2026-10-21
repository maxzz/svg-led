import { type Point, type Rect, nearestOnLine, rectContainsRect, rectFromPoints, rectsIntersect } from "@/svg-core";

/**
 * Lasso selection: the selected elements are those the free-hand lasso encloses (Inclusive)
 * or touches (Exclusive). Elements are tested by their outline, not only by their bounding box.
 */

/** Document-space points of one polyline; a closed shape repeats its first point at the end */
export type Polyline = Point[];

/**
 * Drops lasso points that do not change its shape by more than `tolerance` (Ramer-Douglas-Peucker).
 * The lasso is drawn from the raw points; only the selection test uses the simplified path.
 */
export function simplifyLasso(points: readonly Point[], tolerance: number): Point[] {
    if (points.length < 3) {
        return [...points];
    }

    const keep = new Array<boolean>(points.length).fill(false);
    keep[0] = true;
    keep[points.length - 1] = true;

    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop()!;
        let worst = -1;
        let worstDist = tolerance;
        for (let i = a + 1; i < b; i++) {
            const d = nearestOnLine(points[a], points[b], points[i]).dist;
            if (d > worstDist) {
                worst = i;
                worstDist = d;
            }
        }
        if (worst >= 0) {
            keep[worst] = true;
            stack.push([a, worst], [worst, b]);
        }
    }
    return points.filter((_, i) => keep[i]);
}

/**
 * Ids of the elements the lasso selects. `linesOf` gives an element's polylines, computed only for elements
 * whose bounding box meets the lasso.
 */
export function lassoHits(lasso: readonly Point[], boxes: ReadonlyMap<string, Rect>, linesOf: (id: string) => Polyline[], inclusive: boolean): string[] {
    if (lasso.length < 3) {
        return [];
    }

    const lassoBox = rectFromPoints(lasso)!;
    const hits: string[] = [];
    for (const [id, box] of boxes) {
        if (!rectsIntersect(lassoBox, box)) {
            continue;
        }
        if (inclusive && !rectContainsRect(lassoBox, box)) {
            continue;
        }
        if (touchesLasso(lasso, linesOf(id), inclusive)) {
            hits.push(id);
        }
    }
    return hits;
}

/**
 * Inclusive: every point is inside the lasso and no edge crosses it.
 * Exclusive: some point is inside the lasso, or an edge crosses it.
 */
function touchesLasso(lasso: readonly Point[], lines: readonly Polyline[], inclusive: boolean): boolean {
    let inside = 0;
    let total = 0;
    for (const line of lines) {
        for (const p of line) {
            total++;
            if (pointInPolygon(p, lasso)) {
                inside++;
            }
        }
    }
    if (!total) {
        return false;
    }

    if (linesCrossPolygon(lasso, lines)) {
        return !inclusive;
    }
    return inclusive ? inside === total : inside > 0;
}

/** Pixels the pointer must move before the lasso takes another point */
export const LASSO_STEP_PX = 2;

/** Even-odd test: true when `p` is inside the closed polygon */
export function pointInPolygon(p: Point, poly: readonly Point[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
            inside = !inside;
        }
    }
    return inside;
}

function linesCrossPolygon(polygon: readonly Point[], lines: readonly Polyline[]): boolean {
    for (const line of lines) {
        for (let i = 0; i + 1 < line.length; i++) {
            for (let j = 0; j < polygon.length; j++) {
                if (segmentsCross(line[i], line[i + 1], polygon[j], polygon[(j + 1) % polygon.length])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function orientation(a: Point, b: Point, c: Point): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
    const d1 = orientation(c, d, a);
    const d2 = orientation(c, d, b);
    const d3 = orientation(a, b, c);
    const d4 = orientation(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
