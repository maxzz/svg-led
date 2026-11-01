import {
    type Matrix, type SvgNode, IDENTITY, isIdentity, isShapeNode, multiply, nodeOwnMatrix, shapeToPath, transformNode,
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
 */
export function bakeNodeMatrix(node: SvgNode, precision: number): SvgNode {
    if (node.kind === "passthrough") {
        return structuredClone(node);
    }
    if (isIdentity(nodeOwnMatrix(node))) {
        return stripNodeMatrix(node);
    }
    return applyInParent(node, IDENTITY, precision);
}

//---------------------------------------------------------------------------

/** `parentChange` is a matrix in this node's parent coordinates, applied after the node's own transform. */
function applyInParent(node: SvgNode, parentChange: Matrix, precision: number): SvgNode {
    if (node.kind === "passthrough") {
        return isIdentity(parentChange) ? structuredClone(node) : transformNode(node, parentChange, precision);
    }

    const combined = multiply(parentChange, nodeOwnMatrix(node));

    if (node.kind === "g") {
        const rv = stripNodeMatrix(node);
        rv.children = node.children.map((child) => applyInParent(child, combined, precision));
        return rv;
    }

    return flattenGeometry(stripNodeMatrix(node), combined, precision);
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
