import { type SvgDoc, groupPathIds } from "@/svg-core";
import type { CanvasTarget } from "@/tools/9-types-tool-def";
import { isHiddenOrLocked } from "./1-layer-attrs";

/**
 * True when a click on the canvas may pick the node: neither it nor a group around it is hidden or locked,
 * and while a group is isolated, the node lies inside that group.
 */
export function isPickable(doc: SvgDoc, id: string, isolatedId: string | null): boolean {
    if (isHiddenOrLocked(doc, id)) {
        return false;
    }
    return !isolatedId || groupPathIds(doc, id).includes(isolatedId);
}

/** Turns a canvas target on an element that cannot be picked into empty canvas */
export function filterTarget(doc: SvgDoc, target: CanvasTarget, isolatedId: string | null): CanvasTarget {
    if (target.type === 'node' && !isPickable(doc, target.leafId, isolatedId)) {
        return { type: 'none' };
    }
    return target;
}
