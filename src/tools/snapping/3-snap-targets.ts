import { type Rect, type SvgDoc, walkNodes } from "@/svg-core";
import { nodeDocBBox } from "@/store/3-document";

/**
 * Document bounding boxes that a drag can snap to: every drawn element except the ones being dragged
 * (and their children). Groups are skipped; their elements are already in the list.
 */
export function collectSnapTargets(doc: SvgDoc, draggedIds: readonly string[]): Rect[] {
    const dragged = new Set(draggedIds);
    const rv: Rect[] = [];

    walkNodes(doc.children, (node, parents) => {
        if (dragged.has(node.id) || parents.some((p) => dragged.has(p.id))) {
            return;
        }
        if (node.kind === 'g') {
            return;
        }
        const box = nodeDocBBox(doc, node.id);
        box && rv.push(box);
    });

    return rv;
}
