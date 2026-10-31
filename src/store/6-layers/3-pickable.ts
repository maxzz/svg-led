import { type SvgDoc, groupPathIds } from "@/svg-core";
import { isolationScopeOf } from "@/tools/0-shared/4-group-units";
import type { CanvasTarget } from "@/tools/9-types-tool-def";
import { isHiddenOrLocked } from "./1-layer-attrs";

/**
 * True when a click on the canvas may pick the node: neither it nor a group around it is hidden or locked,
 * and while objects are isolated, the node is one of them or lies inside an isolated group.
 */
export function isPickable(doc: SvgDoc, id: string, isolated: string | readonly string[] | null): boolean {
    if (isHiddenOrLocked(doc, id)) {
        return false;
    }
    const scope = isolationScopeOf(isolated);
    if (!scope.length) {
        return true;
    }
    return scope.includes(id) || groupPathIds(doc, id).some((parent) => scope.includes(parent));
}

/** Turns a canvas target on an element that cannot be picked into empty canvas */
export function filterTarget(doc: SvgDoc, target: CanvasTarget, isolated: string | readonly string[] | null): CanvasTarget {
    if (target.type === 'node' && !isPickable(doc, target.leafId, isolated)) {
        return { type: 'none' };
    }
    return target;
}
