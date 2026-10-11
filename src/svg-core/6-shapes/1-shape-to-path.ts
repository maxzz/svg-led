import { type Anchor, type PathNode, type ShapeNode, type SubPath } from "../1-model/1-types";
import { KAPPA } from "../4-geometry/2-bezier";
import { subpathsToPathData } from "../5-anchors/1-path-anchors";

//---------------------------------------------------------------------------

/** Outline of a native shape as anchors (exact for everything except ellipses, which use the standard kappa approximation) */
export function shapeToSubpaths(node: ShapeNode): SubPath[] {
    switch (node.kind) {
        case 'rect':
            return [rectSubpath(node.x, node.y, node.width, node.height, node.rx, node.ry)];
        case 'circle':
            return [ellipseSubpath(node.cx, node.cy, node.r, node.r)];
        case 'ellipse':
            return [ellipseSubpath(node.cx, node.cy, node.rx, node.ry)];
        case 'line':
            return [{ anchors: [corner(node.x1, node.y1), corner(node.x2, node.y2)], closed: false }];
        case 'polyline':
        case 'polygon':
            return node.points.length ? [{ anchors: node.points.map((p) => corner(p.x, p.y)), closed: node.kind === 'polygon' }] : [];
    }
}

//---------------------------------------------------------------------------

/** "Convert to path": same id and attributes, geometry as path data */
export function shapeToPath(node: ShapeNode, precision: number): PathNode {
    return {
        id: node.id,
        kind: 'path',
        d: subpathsToPathData(shapeToSubpaths(node), precision),
        attrs: { ...node.attrs },
    };
}

//---------------------------------------------------------------------------

function rectSubpath(x: number, y: number, w: number, h: number, rx: number, ry: number): SubPath {
    rx = Math.min(Math.abs(rx), w / 2);
    ry = Math.min(Math.abs(ry), h / 2);
    if (!rx || !ry) {
        return { anchors: [corner(x, y), corner(x + w, y), corner(x + w, y + h), corner(x, y + h)], closed: true };
    }
    const kx = rx * KAPPA;
    const ky = ry * KAPPA;
    const r = x + w;
    const b = y + h;
    return {
        closed: true,
        anchors: [
            { x: x + rx, y, in: { x: x + rx - kx, y }, kind: 'cusp' },
            { x: r - rx, y, out: { x: r - rx + kx, y }, kind: 'cusp' },
            { x: r, y: y + ry, in: { x: r, y: y + ry - ky }, kind: 'cusp' },
            { x: r, y: b - ry, out: { x: r, y: b - ry + ky }, kind: 'cusp' },
            { x: r - rx, y: b, in: { x: r - rx + kx, y: b }, kind: 'cusp' },
            { x: x + rx, y: b, out: { x: x + rx - kx, y: b }, kind: 'cusp' },
            { x, y: b - ry, in: { x, y: b - ry + ky }, kind: 'cusp' },
            { x, y: y + ry, out: { x, y: y + ry - ky }, kind: 'cusp' },
        ],
    };
}

function corner(x: number, y: number): Anchor {
    return { x, y, kind: 'corner' };
}

function ellipseSubpath(cx: number, cy: number, rx: number, ry: number): SubPath {
    const kx = rx * KAPPA;
    const ky = ry * KAPPA;
    return {
        closed: true,
        anchors: [
            { x: cx + rx, y: cy, in: { x: cx + rx, y: cy - ky }, out: { x: cx + rx, y: cy + ky }, kind: 'smooth' },
            { x: cx, y: cy + ry, in: { x: cx + kx, y: cy + ry }, out: { x: cx - kx, y: cy + ry }, kind: 'smooth' },
            { x: cx - rx, y: cy, in: { x: cx - rx, y: cy + ky }, out: { x: cx - rx, y: cy - ky }, kind: 'smooth' },
            { x: cx, y: cy - ry, in: { x: cx - kx, y: cy - ry }, out: { x: cx + kx, y: cy - ry }, kind: 'smooth' },
        ],
    };
}

//---------------------------------------------------------------------------
