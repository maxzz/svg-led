import { type Getter } from "jotai";
import { snapshot } from "valtio";

import { type SvgDoc, applyMatrix, findNode, getShapeHandles, isShapeNode, nodeCtm, pathDataToSubpaths, walkNodes } from "@/svg-core";
import { docState, nodeDocBBox } from "@/store/3-document";
import { anchorsOfNode, nodeAnchorKey, selectedAnchorsAtom, selectionAtom } from "@/store/4-editor";
import { getIsolationScope, isPickable } from "@/store/6-layers";
import { pointsOptionsAtom } from "@/tools/tool-3-points/1-options";
import { type PointTarget, TIER_POINT, boxTargets } from "./1-point-snap-engine";

/** What moves during the drag, so it is not snapped to */
export type PointSnapExclude = {
    nodeIds?: readonly string[];          // elements being reshaped: their bounds change, so they are not targets
    anchors?: ReadonlySet<string>;        // full anchor keys (see nodeAnchorKey) that move together with their handles
    handles?: ReadonlySet<string>;        // handles that move, as `${fullAnchorKey}/${side}` (see handleTargetKey)
};

//---------------------------------------------------------------------------

/**
 * Points a dragged anchor or handle can snap to, in document coordinates: anchors of every element that can be picked,
 * handles and shape handles that are shown on the selected elements, and the bounds of elements (lower priority).
 */
export function collectPointTargets(get: Getter, exclude: PointSnapExclude): PointTarget[] {
    const doc = snapshot(docState).doc as SvgDoc;
    const isolated = getIsolationScope(get);
    const selection = new Set(get(selectionAtom));
    const selectedAnchors = get(selectedAnchorsAtom);
    const { showAllHandles } = get(pointsOptionsAtom);

    const skipNodes = new Set(exclude.nodeIds);
    const skipAnchors = exclude.anchors ?? new Set<string>();
    const skipHandles = exclude.handles ?? new Set<string>();

    const rv: PointTarget[] = [];
    const push = (p: { x: number; y: number; }) => rv.push({ x: p.x, y: p.y, tier: TIER_POINT });

    walkNodes(doc.children, (node) => {
        if (node.kind === 'g' || !isPickable(doc, node.id, isolated)) {
            return;
        }
        const loc = findNode(doc, node.id);
        if (!loc) {
            return;
        }
        
        const ctm = nodeCtm(loc);
        const shown = selection.has(node.id);

        if (node.kind === 'path') {
            const selected = anchorsOfNode(selectedAnchors, node.id);
            pathDataToSubpaths(node.d).forEach(
                (s, si) => {
                    const n = s.anchors.length;
                    s.anchors.forEach(
                        (a, ai) => {
                            const full = nodeAnchorKey(node.id, `${si}:${ai}`);
                            if (skipAnchors.has(full)) {
                                return;
                            }
                            push(applyMatrix(ctm, a));
                            if (!shown) {
                                return;
                            }

                            // the same handles the Direct selection overlay shows
                            const self = selected.has(`${si}:${ai}`);
                            const prevSel = selected.has(`${si}:${(ai - 1 + n) % n}`) && (ai > 0 || s.closed);
                            const nextSel = selected.has(`${si}:${(ai + 1) % n}`) && (ai < n - 1 || s.closed);
                            if (a.in && (showAllHandles || self || prevSel) && !skipHandles.has(handleTargetKey(full, 'in'))) {
                                push(applyMatrix(ctm, a.in));
                            }
                            if (a.out && (showAllHandles || self || nextSel) && !skipHandles.has(handleTargetKey(full, 'out'))) {
                                push(applyMatrix(ctm, a.out));
                            }
                        }
                    );
                }
            );
        } else if (isShapeNode(node) && shown) {
            for (const h of getShapeHandles(node)) {
                skipAnchors.has(nodeAnchorKey(node.id, `h:${h.key}`)) || push(applyMatrix(ctm, h));
            }
        }

        if (!skipNodes.has(node.id)) {
            const box = nodeDocBBox(doc, node.id);
            box && rv.push(...boxTargets(box));
        }
    });

    return rv;
}

export function handleTargetKey(fullAnchorKey: string, side: 'in' | 'out'): string {
    return `${fullAnchorKey}/${side}`;
}
