import { type Matrix, type Point, type Rect, type SubPath, type SvgNode } from "../1-model/1-types";
import { applyMatrix } from "./1-matrix";
import { cubicBBox } from "./2-bezier";
import { nodeOwnMatrix } from "../1-model/3-tree";
import { pathDataToSubpaths } from "../5-anchors/1-path-anchors";
import { segmentCount, segmentCubic, segmentEnds } from "../5-anchors/2-anchor-ops";
import { shapeToSubpaths } from "../6-shapes/1-shape-to-path";

/** Bbox of elements whose geometry the model does not know (text, use, ...); provided by the DOM layer */
export type BBoxFallback = (node: SvgNode) => Rect | null;

export function rectFromPoints(points: readonly Point[]): Rect | null {
    if (!points.length) {
        return null;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function rectFromCorners(a: Point, b: Point): Rect {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

export function unionRects(rects: readonly (Rect | null | undefined)[]): Rect | null {
    const pts: Point[] = [];
    for (const r of rects) {
        if (r) {
            pts.push({ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y + r.height });
        }
    }
    return rectFromPoints(pts);
}

export function transformRect(m: Matrix, r: Rect): Rect {
    return rectFromPoints([
        applyMatrix(m, { x: r.x, y: r.y }),
        applyMatrix(m, { x: r.x + r.width, y: r.y }),
        applyMatrix(m, { x: r.x + r.width, y: r.y + r.height }),
        applyMatrix(m, { x: r.x, y: r.y + r.height }),
    ])!;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
    return a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height;
}

export function rectContainsPoint(r: Rect, p: Point): boolean {
    return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** True when `inner` lies entirely within `outer` (edges may touch) */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
    return inner.x >= outer.x && inner.y >= outer.y
        && inner.x + inner.width <= outer.x + outer.width
        && inner.y + inner.height <= outer.y + outer.height;
}

//---------------------------------------------------------------------------

export function subpathsBBox(subpaths: readonly SubPath[]): Rect | null {
    const rects: Rect[] = [];
    for (const sub of subpaths) {
        for (const a of sub.anchors) {
            rects.push({ x: a.x, y: a.y, width: 0, height: 0 });
        }
        const count = segmentCount(sub);
        for (let seg = 0; seg < count; seg++) {
            const [a, b] = segmentEnds(sub, seg);
            const c = segmentCubic(a, b);
            if (c) {
                rects.push(cubicBBox(c));
            }
        }
    }
    return unionRects(rects);
}

/** Outline anchors of paths and native shapes; undefined for groups and passthrough elements */
export function nodeOutline(node: SvgNode): SubPath[] | undefined {
    switch (node.kind) {
        case 'path':
            return pathDataToSubpaths(node.d);
        case 'g':
        case 'passthrough':
            return undefined;
        default:
            return shapeToSubpaths(node);
    }
}

//---------------------------------------------------------------------------

/** Bbox in the node's own coordinates (before its transform attribute) */
export function localBBox(node: SvgNode, fallback?: BBoxFallback): Rect | null {
    switch (node.kind) {
        case 'g':
            return unionRects(node.children.map((c) => {
                const r = localBBox(c, fallback);
                return r && transformRect(nodeOwnMatrix(c), r);
            }));
        case 'passthrough':
            return fallback?.(node) ?? null;
        case 'rect':
            return { x: node.x, y: node.y, width: node.width, height: node.height };
        case 'circle':
            return { x: node.cx - node.r, y: node.cy - node.r, width: 2 * node.r, height: 2 * node.r };
        case 'ellipse':
            return { x: node.cx - node.rx, y: node.cy - node.ry, width: 2 * node.rx, height: 2 * node.ry };
        default:
            return subpathsBBox(nodeOutline(node) ?? []);
    }
}
