import { type SvgNode, localBBox, nodeOwnMatrix, transformRect } from "@/svg-core";
import { domBBoxFallback } from "@/store/3-document";
import { NodeView } from "../1-canvas/2-doc-layer/2-node-view";

/**
 * Preview of one layer, fitted into a small square. The bbox is taken in the parent's coordinates (the node's own transform applied),
 * so the preview does not depend on the groups around the node. Hidden elements are still drawn here.
 * `snap` is the row's snapshot of the node; it makes the preview re-render when the node changes.
 */
export function LayerThumbnail({ node, snap }: { node: SvgNode; snap: SvgNode; }) {
    const local = localBBox(snap, domBBoxFallback);
    const box = local && transformRect(nodeOwnMatrix(snap), local);

    return (
        <div className="shrink-0 size-6 bg-white ring-1 ring-foreground/15 rounded-xs overflow-hidden flex items-center justify-center">
            {box && (
                <svg className="size-full [&_[display=none]]:inline" viewBox={thumbViewBox(box)} aria-hidden>
                    <NodeView node={node} detached />
                </svg>
            )}
        </div>
    );
}

function thumbViewBox(box: { x: number; y: number; width: number; height: number; }): string {
    const pad = Math.max(box.width, box.height, 1e-3) * 0.12;
    return `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`;
}
