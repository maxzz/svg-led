import { type PathNode, type SvgNode } from "../1-model/1-types";
import { newNodeId } from "../1-model/2-node-ids";
import { nodeOwnMatrix } from "../1-model/3-tree";
import { type PathSeg, parsePathData } from "../2-parse/2-parse-path-data";
import { serializePathSegs } from "../3-serialize/2-serialize-path";
import { invert, multiply } from "../4-geometry/1-matrix";
import { transformSegs } from "./1-transform-path";

//---------------------------------------------------------------------------
// Compound paths: one path element with two or more subpaths (for example an outline with holes).

/**
 * Splits segments into subpaths, each starting with a moveto. A moveto without drawing commands after it is dropped,
 * so the count of subpaths is the count of visible pieces.
 */
export function splitSubpathSegs(segs: readonly PathSeg[]): PathSeg[][] {
    const rv: PathSeg[][] = [];
    let cur: PathSeg[] | null = null;
    for (const s of segs) {
        if (s.c === 'M') {
            cur = [s];
            rv.push(cur);
        } else if (cur) {
            cur.push(s);
        }
    }
    return rv.filter((group) => group.length > 1);
}

export function subpathCount(d: string): number {
    return splitSubpathSegs(parsePathData(d)).length;
}

/** A path with two or more subpaths */
export function isCompoundPath(node: SvgNode): node is PathNode {
    return node.kind === 'path' && subpathCount(node.d) >= 2;
}

//---------------------------------------------------------------------------

/**
 * Make compound path: joins paths into one path element, in the order given.
 * Each path is moved into the coordinate system of the last one, whose transform and attributes the result keeps
 * (the last path is the topmost one). Pass shapes already converted to paths.
 */
export function combinePaths(paths: readonly PathNode[], precision: number): PathNode {
    const base = paths[paths.length - 1];
    const toBase = invert(nodeOwnMatrix(base));
    const segs: PathSeg[] = [];

    for (const p of paths) {
        const m = multiply(toBase, nodeOwnMatrix(p));
        for (const group of splitSubpathSegs(parsePathData(p.d))) {
            segs.push(...transformSegs(group, m));
        }
    }

    return {
        id: newNodeId(),
        kind: 'path',
        d: serializePathSegs(segs, precision),
        attrs: { ...base.attrs },
    };
}

/**
 * Release compound path: each subpath becomes its own path with the same attributes and transform.
 * The first one keeps the `id` attribute, the others lose it so that ids stay unique.
 */
export function releaseCompoundPath(node: PathNode, precision: number): PathNode[] {
    return splitSubpathSegs(parsePathData(node.d)).map((group, i) => {
        const attrs = { ...node.attrs };
        if (i > 0) {
            delete attrs.id;
        }
        return { id: newNodeId(), kind: 'path', d: serializePathSegs(group, precision), attrs };
    });
}
