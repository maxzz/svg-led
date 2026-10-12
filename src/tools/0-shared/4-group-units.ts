import { type SvgDoc, groupPathIds } from "@/svg-core";

/**
 * The node a click on `leafId` selects.
 * Outside group editing that is the outermost group around the element (or the element itself).
 * Inside the group being edited it is the child of that group on the path, or the element itself.
 */
export function selectionUnitId(doc: SvgDoc, leafId: string, editingGroupId: string | null): string {
    const chain = [...groupPathIds(doc, leafId), leafId];
    const editingIndex = editingGroupId ? chain.indexOf(editingGroupId) : -1;
    return chain[editingIndex + 1] ?? leafId;
}

/** The innermost group around `leafId` that is in the selection, if any */
export function selectedGroupOnPath(doc: SvgDoc, leafId: string, selection: readonly string[]): string | undefined {
    const path = groupPathIds(doc, leafId);
    for (let i = path.length - 1; i >= 0; i--) {
        if (selection.includes(path[i])) {
            return path[i];
        }
    }
    return undefined;
}
