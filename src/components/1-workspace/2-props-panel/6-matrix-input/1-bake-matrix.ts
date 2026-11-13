import {
    type Matrix, type SvgNode, IDENTITY, getPresentation, isIdentity, isPaintVisible, isShapeNode, makeFmt, multiply, nodeOwnMatrix, setPresentation, shapeToPath, transformNode,
} from "@/svg-core";

/** True when Apply can write this node's matrix into points (or into a group's children). */
export function canBakeMatrix(node: SvgNode): boolean {
    return node.kind !== "passthrough" && !isIdentity(nodeOwnMatrix(node));
}

/** Drops the transform attribute. Geometry is not moved. */
export function stripNodeMatrix<T extends SvgNode>(node: T): T {
    const rv = structuredClone(node);
    delete rv.attrs.transform;
    return rv;
}

/**
 * Writes the node's transform into its points and removes the matrix.
 * Shapes that cannot hold the transform (a rotated rect, a skewed ellipse) become paths.
 * A group's matrix is pushed through its descendants. Elements with no points (text, image, …)
 * keep a transform attribute, because there is nowhere to put the numbers.
 *
 * Stroke widths are scaled with the transform so the element renders the same size.
 * `parents` are the groups around the node, outermost first; their stroke width is inherited.
 */
export function bakeNodeMatrix(node: SvgNode, precision: number, parents: readonly SvgNode[] = []): SvgNode {
    if (node.kind === "passthrough") {
        return structuredClone(node);
    }
    if (isIdentity(nodeOwnMatrix(node))) {
        return stripNodeMatrix(node);
    }
    return applyInParent(node, IDENTITY, precision, outerStroke(parents));
}

//---------------------------------------------------------------------------

/**
 * Stroke width a node inherits. `orig` is the value in the source document; `next` is the value it
 * inherits in the baked tree. NaN marks a width that cannot be scaled (a percentage, em, …).
 * `paint` is the nearest stroke paint set by an ancestor, so a width is only written where a stroke shows.
 */
interface InheritedStroke {
    orig: number;
    next: number;
    paint?: string;
}

const DEFAULT_STROKE = 1;

/** Plain number or px. NaN for anything else, which is left as written. */
function strokeNumber(value: string): number {
    const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(?:px)?\s*$/i.exec(value);
    return m ? Number(m[1]) : Number.NaN;
}

/** Scale that a matrix applies to lengths: the geometric mean of its two axis scales. Exact for uniform scale and rotation. */
function linearScale(m: Matrix): number {
    return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

/** Nearest value of a presentation property set on the groups around a node */
function inheritedPresentation(parents: readonly SvgNode[], prop: string): string | undefined {
    for (let i = parents.length - 1; i >= 0; i--) {
        const value = getPresentation(parents[i].attrs, prop);
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}

/** The stroke width the root of the bake inherits from the groups around it */
function outerStroke(parents: readonly SvgNode[]): InheritedStroke {
    const own = inheritedPresentation(parents, 'stroke-width');
    const value = own === undefined ? DEFAULT_STROKE : strokeNumber(own);
    return { orig: value, next: value, paint: inheritedPresentation(parents, 'stroke') };
}

/**
 * Makes `node` render its stroke at the same size after the bake. `scale` is the linear scale that the
 * node's transform change contributes once it is baked. It is 1 when the transform stays on the element.
 * Writes stroke-width when the node has its own value, or when it inherits a width that would now be wrong
 * and it actually draws a stroke. A node with no visible stroke gets no stroke-width.
 */
function settleStroke(node: SvgNode, inherited: InheritedStroke, scale: number, precision: number): InheritedStroke {
    const fmt = makeFmt(precision);
    const own = getPresentation(node.attrs, 'stroke-width');
    const paint = getPresentation(node.attrs, 'stroke') ?? inherited.paint;

    if (own !== undefined) {
        const orig = strokeNumber(own);
        if (Number.isNaN(orig)) {
            return { orig: Number.NaN, next: Number.NaN, paint };
        }
        if (scale === 1) {
            return { orig, next: orig, paint };
        }
        const next = orig * scale;
        setPresentation(node.attrs, 'stroke-width', fmt(next));
        return { orig, next: Number(fmt(next)), paint };
    }

    if (Number.isNaN(inherited.orig)) {
        return { orig: Number.NaN, next: Number.NaN, paint };
    }
    const target = inherited.orig * scale;
    const tolerance = 10 ** -precision;
    if (Math.abs(target - inherited.next) > tolerance && isPaintVisible(paint, 'stroke')) {
        setPresentation(node.attrs, 'stroke-width', fmt(target));
        return { orig: inherited.orig, next: Number(fmt(target)), paint };
    }
    return { orig: inherited.orig, next: inherited.next, paint };
}

/** `parentChange` is a matrix in this node's parent coordinates, applied after the node's own transform. */
function applyInParent(node: SvgNode, parentChange: Matrix, precision: number, inherited: InheritedStroke): SvgNode {
    const combined = multiply(parentChange, nodeOwnMatrix(node));

    if (node.kind === "passthrough") {
        const rv = isIdentity(parentChange) ? structuredClone(node) : transformNode(node, parentChange, precision);
        settleStroke(rv, inherited, 1, precision); // transform stays on the element, so its size does not change
        return rv;
    }

    if (node.kind === "g") {
        const rv = stripNodeMatrix(node);
        // A group only writes stroke-width when it has its own. Otherwise its children work out their own values.
        const state = getPresentation(rv.attrs, 'stroke-width') !== undefined
            ? settleStroke(rv, inherited, linearScale(combined), precision)
            : { ...inherited, paint: getPresentation(rv.attrs, 'stroke') ?? inherited.paint };
        rv.children = node.children.map((child) => applyInParent(child, combined, precision, state));
        return rv;
    }

    const baked = flattenGeometry(stripNodeMatrix(node), combined, precision);
    const kept = baked.attrs.transform !== undefined; // transform stays on the element, so its size does not change
    settleStroke(baked, inherited, kept ? 1 : linearScale(combined), precision);
    return baked;
}

/** `node` has no transform. `m` is applied to its geometry and then dropped, converting to a path if that is the only way. */
function flattenGeometry(node: SvgNode, m: Matrix, precision: number): SvgNode {
    if (isIdentity(m)) {
        return node;
    }
    const baked = transformNode(node, m, precision);
    if (!baked.attrs.transform) {
        return baked;
    }
    if (isShapeNode(node)) {
        return transformNode(shapeToPath(node, precision), m, precision);
    }
    return baked;
}
