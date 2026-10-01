import { type Rect, type SvgDoc, type SvgNode, findNode, localBBox, nodeCtm, transformRect, unionRects } from "@/svg-core";

/** Bbox of elements without model geometry (text, use, image, ...) measured on the rendered canvas */
export function domBBoxFallback(node: SvgNode): Rect | null {
    const el = document.querySelector(`[data-nid="${node.id}"]`);
    if (el instanceof SVGGraphicsElement) {
        try {
            const b = el.getBBox();
            return { x: b.x, y: b.y, width: b.width, height: b.height };
        } catch {
            return null;
        }
    }
    return null;
}

/** Bbox of a node in document coordinates */
export function nodeDocBBox(doc: SvgDoc, id: string): Rect | null {
    const loc = findNode(doc, id);
    if (!loc) {
        return null;
    }
    const local = localBBox(loc.node, domBBoxFallback);
    return local && transformRect(nodeCtm(loc), local);
}

export function nodesDocBBox(doc: SvgDoc, ids: readonly string[]): Rect | null {
    return unionRects(ids.map((id) => nodeDocBBox(doc, id)));
}
