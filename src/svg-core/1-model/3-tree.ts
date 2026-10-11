import { type SvgDoc, type SvgNode, type GroupNode, type Matrix } from "./1-types";
import { IDENTITY, multiply } from "../4-geometry/1-matrix";
import { parseTransform } from "../2-parse/3-parse-transform";

//---------------------------------------------------------------------------

export function walkNodes(nodes: readonly SvgNode[], visit: (node: SvgNode, parents: GroupNode[]) => void | false, parents: GroupNode[] = []): void {
    for (const node of nodes) {
        if (visit(node, parents) === false) {
            continue;
        }
        if (node.kind === 'g') {
            walkNodes(node.children, visit, [...parents, node]);
        }
    }
}

//---------------------------------------------------------------------------

export type NodeLocation = {
    node: SvgNode;
    siblings: SvgNode[];         // array that holds the node (doc.children or group.children)
    index: number;
    parents: GroupNode[];        // outermost first
};

export function findNode(doc: SvgDoc, id: string): NodeLocation | undefined {
    return findIn(doc.children, id, []);
}

function findIn(siblings: SvgNode[], id: string, parents: GroupNode[]): NodeLocation | undefined {
    for (let index = 0; index < siblings.length; index++) {
        const node = siblings[index];
        if (node.id === id) {
            return { node, siblings, index, parents };
        }
        if (node.kind === 'g') {
            const rv = findIn(node.children, id, [...parents, node]);
            if (rv) {
                return rv;
            }
        }
    }
}

//---------------------------------------------------------------------------

export function nodeOwnMatrix(node: SvgNode): Matrix {
    const t = node.attrs.transform;
    return t ? parseTransform(t) : IDENTITY;
}

export function parentsMatrix(parents: readonly SvgNode[]): Matrix {
    let m: Matrix = IDENTITY;
    for (const p of parents) {
        m = multiply(m, nodeOwnMatrix(p));
    }
    return m;
}

/** Matrix from node-local coordinates to document coordinates */
export function nodeCtm(loc: NodeLocation): Matrix {
    return multiply(parentsMatrix(loc.parents), nodeOwnMatrix(loc.node));
}

//---------------------------------------------------------------------------

export function allNodeIds(doc: SvgDoc): Set<string> {
    const rv = new Set<string>();
    walkNodes(doc.children, (n) => { rv.add(n.id); });
    return rv;
}

/**
 * Gives nodes of a re-parsed document the ids of the previous document at the same pre-order
 * position when the kind matches, so selection and rendering survive edits of the source text.
 */
export function reuseNodeIds(prev: readonly SvgNode[], next: readonly SvgNode[]): void {
    const flat = (nodes: readonly SvgNode[]) => {
        const rv: SvgNode[] = [];
        walkNodes(nodes, (n) => { rv.push(n); });
        return rv;
    };
    const a = flat(prev);
    const b = flat(next);
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i].kind === b[i].kind) {
            b[i].id = a[i].id;
        }
    }
}

/** Removes ids whose ancestor is also in the list, so operations do not apply twice */
export function topmostIds(doc: SvgDoc, ids: readonly string[]): string[] {
    const set = new Set(ids);
    return ids.filter(
        (id) => {
            const loc = findNode(doc, id);
            return loc && !loc.parents.some((p) => set.has(p.id));
        }
    );
}

//---------------------------------------------------------------------------
