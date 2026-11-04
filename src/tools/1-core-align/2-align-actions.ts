import { snapshot } from "valtio";
import { type SvgDoc, topmostIds, translateMatrix } from "@/svg-core";
import { applyDocMatrix, captureOriginals, commitHistory, docState, nodeDocBBox } from "@/store/3-document";
import { type AlignEdge, type AlignItem, type AlignOffset, type DistributeAxis, alignOffsets, distributeOffsets } from "./1-align-math";

/** Aligns the selected elements to the selection bounds; groups move as one element */
export function alignNodes(ids: readonly string[], edge: AlignEdge): void {
    applyOffsets(ids, (items) => alignOffsets(items, edge));
}

/** Spaces the selected elements evenly along an axis; needs at least three elements */
export function distributeNodes(ids: readonly string[], axis: DistributeAxis): void {
    applyOffsets(ids, (items) => distributeOffsets(items, axis));
}

function applyOffsets(ids: readonly string[], compute: (items: AlignItem[]) => AlignOffset[]): void {
    const doc = snapshot(docState).doc as SvgDoc;
    const items = topmostIds(doc, ids).flatMap((id): AlignItem[] => {
        const rect = nodeDocBBox(doc, id);
        return rect ? [{ id, rect }] : [];
    });

    const moves = compute(items).filter((o) => o.dx || o.dy);
    if (!moves.length) {
        return;
    }

    for (const { id, dx, dy } of moves) {
        applyDocMatrix(captureOriginals([id]), translateMatrix(dx, dy));
    }
    commitHistory();
}
