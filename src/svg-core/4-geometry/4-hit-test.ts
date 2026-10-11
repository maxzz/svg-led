import { type Point, type SubPath } from "../1-model/1-types";
import { cubicPoint } from "./2-bezier";
import { nearestSegment, segmentCubic, segmentEnds } from "../5-anchors/2-anchor-ops";

/** Distance from a point to the outline */
export function distanceToOutline(subpaths: readonly SubPath[], p: Point): number {
    return nearestSegment(subpaths, p)?.dist ?? Infinity;
}

/** Even-odd point-in-shape test on the flattened outline; open subpaths are closed implicitly like SVG fill does */
export function pointInOutline(subpaths: readonly SubPath[], p: Point): boolean {
    let inside = false;
    for (const poly of flattenSubpaths(subpaths)) {

        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i];
            const b = poly[j];
            if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
                inside = !inside;
            }
        }
    }
    return inside;
}

export function flattenSubpaths(subpaths: readonly SubPath[], steps = 16): Point[][] {
    return subpaths.map(
        (sub) => {
            const pts: Point[] = [];
            if (sub.anchors.length) {
                pts.push({ x: sub.anchors[0].x, y: sub.anchors[0].y });
            }
            const count = sub.closed ? sub.anchors.length : sub.anchors.length - 1;

            for (let seg = 0; seg < count; seg++) {
                const [a, b] = segmentEnds(sub, seg);
                const c = segmentCubic(a, b);
                if (c) {
                    for (let i = 1; i <= steps; i++) {
                        pts.push(cubicPoint(c, i / steps));
                    }
                } else {
                    pts.push({ x: b.x, y: b.y });
                }
            }
            return pts;
        }
    );
}
