import { snapshot } from "valtio";
import { type GroupNode, type SvgDoc, type SvgNode, findNode, invert, isIdentity, multiply, parentsMatrix, topmostIds, transformNode, walkNodes } from "@/svg-core";
import { commitHistory, docPrecision, docState } from "../3-document";

/** Where dragged layers land, relative to the row they are dropped on (the tree lists the topmost element first) */
export type DropPlace =
    | 'above'                    // right above the target in the stacking order of its parent
    | 'below'                    // right below the target
    | 'inside';                  // on top of the target group's children

export type LayerDrop = { targetId: string; place: DropPlace; };

/** The drop keeps the layers in the document and does not put a group inside itself */
export function canDropLayers(doc: SvgDoc, ids: readonly string[], drop: LayerDrop): boolean {
    const loc = findNode(doc, drop.targetId);
    if (!loc || (drop.place === 'inside' && loc.node.kind !== 'g')) {
        return false;
    }
    const moving = new Set(ids);
    return ![...loc.parents, loc.node].some((n) => moving.has(n.id));
}

/**
 * Moves layers to a new place in the tree, keeping their relative stacking order and where they appear on the canvas
 * (geometry is converted into the new parent's coordinates). Returns false when nothing changed.
 */
export function moveLayers(ids: readonly string[], drop: LayerDrop): boolean {
    const doc = docState.doc;
    const top = inDocumentOrder(doc, topmostIds(doc, ids));
    if (!top.length || !canDropLayers(doc, top, drop)) {
        return false;
    }

    const target = findNode(doc, drop.targetId)!;
    const newParents: GroupNode[] = drop.place === 'inside' ? [...target.parents, target.node as GroupNode] : target.parents;
    const newParentId = newParents.at(-1)?.id;
    const docToNew = invert(parentsMatrix(newParents));
    const precision = docPrecision();
    const before = treeSignature(doc);

    const moved = top.map(
        (id) => {
            const loc = findNode(doc, id)!;
            const plain = structuredClone(snapshot(loc.node) as SvgNode);
            if (loc.parents.at(-1)?.id === newParentId) {
                return plain;
            }
            const m = multiply(docToNew, parentsMatrix(loc.parents));
            return isIdentity(m) ? plain : transformNode(plain, m, precision);
        }
    );

    for (const id of top) {
        const loc = findNode(doc, id);
        loc?.siblings.splice(loc.index, 1);
    }

    const anchor = findNode(doc, drop.targetId)!;
    if (drop.place === 'inside') {
        (anchor.node as GroupNode).children.push(...moved);
    } else {
        anchor.siblings.splice(drop.place === 'above' ? anchor.index + 1 : anchor.index, 0, ...moved);
    }

    if (treeSignature(doc) === before) {
        return false;
    }
    commitHistory();
    return true;
}

function inDocumentOrder(doc: SvgDoc, ids: readonly string[]): string[] {
    const order = new Map<string, number>();
    walkNodes(doc.children, (n) => { order.set(n.id, order.size); });
    return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/** Parent and position of every node; equal signatures mean the same tree structure */
function treeSignature(doc: SvgDoc): string {
    const parts: string[] = [];
    walkNodes(doc.children, (n, parents) => { parts.push(`${parents.at(-1)?.id ?? ''}>${n.id}`); });
    return parts.join('|');
}
