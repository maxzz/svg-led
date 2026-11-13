import { type Matrix, type SvgNode } from "../1-model/1-types";
import { nodeOwnMatrix } from "../1-model/3-tree";
import { parseTransform } from "../2-parse/3-parse-transform";
import { applyMatrix, invert, isAxisAligned, isIdentity, isSimilarity, matrixToString, multiply } from "../4-geometry/1-matrix";
import { makeFmt } from "../3-serialize/1-format";
import { transformPathData } from "./1-transform-path";

/**
 * Returns a copy of the node transformed by `m`, where `m` is expressed in the node's parent coordinates
 * (applied after the node's own transform attribute).
 *
 * The change is baked into the geometry when the shape kind can represent it exactly
 * (paths, lines and polygons always; rects and ellipses when axis-aligned; circles under similarity).
 * Otherwise the matrix is prepended to the node's transform attribute.
 * A result that rounds to a no-op, such as matrix(1 0 0 1 0 0) or translate(0 0), is left off.
 */
export function transformNode(node: SvgNode, m: Matrix, precision: number): SvgNode {
    if (isIdentity(m)) {
        return omitNoOpTransform(structuredClone(node));
    }

    const own = nodeOwnMatrix(node);

    // A non-uniform change on a group would skew every child's stroke through the group's transform attribute.
    // Push the change into the children instead, so their stroke widths stay as they are.
    if (node.kind === 'g' && !isSimilarity(m)) {
        const rv = structuredClone(node);
        delete rv.attrs.transform;
        const childChange = multiply(m, own);
        rv.children = node.children.map((child) => transformNode(child, childChange, precision));
        return rv;
    }

    const local = multiply(invert(own), multiply(m, own)); // the same change expressed in the node's own coordinates

    const baked = bakeGeometry(node, local, precision);
    if (baked) {
        return omitNoOpTransform(baked);
    }

    const rv = structuredClone(node);
    const text = matrixToString(multiply(m, own), makeFmt(Math.max(precision, 6)));
    if (isNoOpTransform(text)) {
        delete rv.attrs.transform;
    } else {
        rv.attrs.transform = text;
    }
    return rv;
}

/** matrix(1 0 0 1 0 0), translate(0, 0), scale(1), rotate(0), and the same written with commas or extra spaces. */
const TRANSFORM_FNS = /^(?:(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([^)]*\)\s*)+$/;

function isNoOpTransform(text: string): boolean {
    const body = text.trim();
    return TRANSFORM_FNS.test(body) && isIdentity(parseTransform(body));
}

function omitNoOpTransform(node: SvgNode): SvgNode {
    if (!node.attrs.transform || !isNoOpTransform(node.attrs.transform)) {
        return node;
    }
    const rv = structuredClone(node);
    delete rv.attrs.transform;
    return rv;
}

//---------------------------------------------------------------------------

/** Baked numbers are rounded to the document precision so the model matches the serialized source */
function bakeGeometry(node: SvgNode, m: Matrix, precision: number): SvgNode | undefined {
    const fmt = makeFmt(precision);
    const n = (v: number) => Number(fmt(v));
    const t = (x: number, y: number) => {
        const p = applyMatrix(m, { x, y });
        return { x: n(p.x), y: n(p.y) };
    };

    switch (node.kind) {
        case 'path':
            return { ...structuredClone(node), d: transformPathData(node.d, m, precision) };

        case 'line': {
            const p1 = t(node.x1, node.y1);
            const p2 = t(node.x2, node.y2);
            return { ...structuredClone(node), x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
        }

        case 'polyline':
        case 'polygon':
            return { ...structuredClone(node), points: node.points.map((p) => t(p.x, p.y)) };

        case 'rect': {
            if (!isAxisAligned(m)) {
                return;
            }
            const p1 = t(node.x, node.y);
            const p2 = t(node.x + node.width, node.y + node.height);
            return {
                ...structuredClone(node),
                x: Math.min(p1.x, p2.x),
                y: Math.min(p1.y, p2.y),
                width: n(Math.abs(p2.x - p1.x)),
                height: n(Math.abs(p2.y - p1.y)),
                rx: n(node.rx * Math.abs(m[0])),
                ry: n(node.ry * Math.abs(m[3])),
            };
        }

        case 'circle': {
            const c = t(node.cx, node.cy);
            if (isSimilarity(m)) {
                return { ...structuredClone(node), cx: c.x, cy: c.y, r: n(node.r * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))) };
            }
            if (isAxisAligned(m)) {
                // non-uniform scale turns the circle into an ellipse
                return { id: node.id, kind: 'ellipse', cx: c.x, cy: c.y, rx: n(node.r * Math.abs(m[0])), ry: n(node.r * Math.abs(m[3])), attrs: { ...node.attrs } };
            }
            return;
        }

        case 'ellipse': {
            if (!isAxisAligned(m)) {
                return;
            }
            const c = t(node.cx, node.cy);
            return { ...structuredClone(node), cx: c.x, cy: c.y, rx: n(node.rx * Math.abs(m[0])), ry: n(node.ry * Math.abs(m[3])) };
        }
    }
}

//---------------------------------------------------------------------------

/** Converts a change given in document coordinates into the node's parent coordinates */
export function docToParentMatrix(mDoc: Matrix, parentCtm: Matrix): Matrix {
    return multiply(invert(parentCtm), multiply(mDoc, parentCtm));
}
