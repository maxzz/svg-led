import { type SvgDoc, groupPathIds } from "@/svg-core";

/** One isolated id, several, or none. A string is the single-object form callers already pass. */
export function isolationScopeOf(isolated: string | readonly string[] | null | undefined): readonly string[] {
    if (!isolated) {
        return [];
    }
    return typeof isolated === 'string' ? [isolated] : isolated;
}

/**
 * The node a click on `leafId` selects.
 * Outside isolation that is the outermost group around the element (or the element itself).
 * Inside isolation it is the child of the deepest isolated group on the path, or the isolated element itself.
 */
export function selectionUnitId(doc: SvgDoc, leafId: string, isolated: string | readonly string[] | null): string {
    const chain = [...groupPathIds(doc, leafId), leafId];
    let editingIndex = -1;
    for (const id of isolationScopeOf(isolated)) {
        const index = chain.indexOf(id);
        if (index > editingIndex) {
            editingIndex = index;
        }
    }
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
