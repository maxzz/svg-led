import { atom } from "jotai";
import { type SvgDoc, findNode, plainName } from "@/svg-core";
import { docState } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { getIsolationScope, isHiddenOrLocked, isLocked, isolationCollapsedAtom, isolationManyOpenAtom } from "@/store/6-layers";
import { expandedIdsAtom } from "./2-expanded-groups";
import { visibleRowIds } from "./4-visible-rows";

//---------------------------------------------------------------------------
// Selection from the tree

/** Row where the last plain click happened; Shift+click selects from it */
export const rangeAnchorAtom = atom<string | null>(null);

/**
 * A `<defs>` is never drawn, so its display does not matter: it can be selected in the tree even when hidden
 * (its own display or a hidden group around it). Locking still applies.
 */
function isLayerRowBlocked(doc: SvgDoc, id: string): boolean {
    const loc = findNode(doc, id);
    if (!loc) {
        return true;
    }
    const { node, parents } = loc;
    if (node.kind === 'passthrough' && plainName(node.tag).toLowerCase() === 'defs') {
        return [node, ...parents].some(isLocked);
    }
    return isHiddenOrLocked(doc, id);
}

/** Hidden and locked layers cannot be selected, as on the canvas; a hidden `<defs>` can be (see `isLayerRowBlocked`) */
export const selectLayersAtom = atom(
    null,
    (_get, set, ids: string[]) => {
        set(setSelectionAtom, ids.filter((id) => !isLayerRowBlocked(docState.doc, id)));
    }
);

type RowClick = { id: string; shift: boolean; ctrl: boolean; };

/**
 * Click on a row or its selection circle:
 * plain click selects only that item, Ctrl+click toggles it, Shift+click selects the range from the anchor
 * (the last plain click, or the first selected row) to the clicked row.
 */
export const rowClickAtom = atom(
    null,
    (get, set, { id, shift, ctrl }: RowClick) => {
        const selection = get(selectionAtom);
        if (ctrl) {
            set(selectLayersAtom, selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]);
            set(rangeAnchorAtom, id);
            return;
        }

        if (shift) {
            const rows = visibleRowIds(get(expandedIdsAtom), getIsolationScope(get), get(isolationCollapsedAtom), get(isolationManyOpenAtom));
            const anchor = [get(rangeAnchorAtom), ...rows.filter((r) => selection.includes(r))].find((a) => a && rows.includes(a));
            const from = anchor ? rows.indexOf(anchor) : -1;
            const to = rows.indexOf(id);
            if (from >= 0 && to >= 0) {
                set(selectLayersAtom, rows.slice(Math.min(from, to), Math.max(from, to) + 1));
                return;
            }
        }

        set(selectLayersAtom, [id]);
        set(rangeAnchorAtom, id);
    }
);
