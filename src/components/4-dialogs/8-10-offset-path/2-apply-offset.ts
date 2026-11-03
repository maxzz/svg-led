import { snapshot } from "valtio";
import { type PathNode, type SvgNode, findNode, newNodeId, offsetPathData, pathFillRule, type OffsetPathOptions } from "@/svg-core";
import { commitHistory, docPrecision, docState } from "@/store/3-document";

/**
 * Inserts an offset copy after each selected path and records one undo step.
 * The originals stay. Returns the new ids in selection order. Paths whose offset
 * disappears (a shape shrunk to nothing) are skipped.
 */
export function applyOffsetPaths(ids: readonly string[], options: OffsetPathOptions): string[] {
    const doc = docState.doc;
    const precision = docPrecision();
    const seen = new Set<string>();
    const plans: { siblings: SvgNode[]; index: number; node: PathNode; }[] = [];

    for (const id of ids) {
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        const loc = findNode(doc, id);
        if (!loc || loc.node.kind !== 'path') {
            continue;
        }
        const src = snapshot(loc.node) as PathNode;
        const d = offsetPathData(src.d, { ...options, fillRule: pathFillRule(src.attrs) }, precision);
        if (!d) {
            continue;
        }
        const attrs = { ...src.attrs };
        delete attrs.id;
        plans.push({
            siblings: loc.siblings,
            index: loc.index,
            node: { id: newNodeId(), kind: 'path', d, attrs },
        });
    }

    const created = plans.map((plan) => plan.node.id);
    // Higher indexes first, so an insert does not shift a sibling still waiting.
    plans.sort((a, b) => b.index - a.index);
    for (const plan of plans) {
        plan.siblings.splice(plan.index + 1, 0, plan.node);
    }
    if (created.length) {
        commitHistory();
    }
    return created;
}
