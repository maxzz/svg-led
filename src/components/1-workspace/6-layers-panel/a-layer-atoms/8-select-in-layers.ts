import { atom } from "jotai";
import { type SvgDoc, defsItemsOf, findNode, isDefsItemOf, parseDefsItemId } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { defsSelectionAtom, setDefsSelectionAtom } from "@/store/4-editor";
import { exitIsolationToAtom, getIsolationScope, isolationCollapsedAtom, isolationManyOpenAtom } from "@/store/6-layers";
import { expandedIdsAtom } from "./2-expanded-groups";
import { defsAncestorIdsOf } from "./3-selection-markers";
import { rangeAnchorAtom, selectLayersAtom } from "./5-row-click";

//---------------------------------------------------------------------------
// Select in layers (from the code editor)

/** Frames to wait for a row that is not rendered yet (its group was just opened, or the panel was just shown) */
const REVEAL_FRAMES = 30;

/** Ids of the rows that hold the row `id`, outermost first. A `<defs>` item sits inside its `<defs>` element, which sits inside the groups around it. */
function rowAncestorIds(doc: SvgDoc, id: string): string[] {
    const parsed = parseDefsItemId(id);
    if (!parsed) {
        return findNode(doc, id)?.parents.map((p) => p.id) ?? [];
    }
    const loc = findNode(doc, parsed.defsId);
    if (!loc || loc.node.kind !== 'passthrough') {
        return [];
    }
    const items = defsAncestorIdsOf(parsed.defsId, defsItemsOf(loc.node.inner), parsed.part) ?? [];
    return [...loc.parents.map((p) => p.id), parsed.defsId, ...items];
}

/** The tree row of a node, or of a `<defs>` item (an element or a class) */
function rowSelector(id: string): string {
    const key = CSS.escape(id);
    return parseDefsItemId(id)
        ? `[data-defs-element="${key}"], [data-defs-class="${key}"]`
        : `[data-layer-id="${key}"]`;
}

/**
 * Scrolls the tree vertically so the row is inside the scroll area; a class also brings its declaration table into view.
 * Waits a few frames while the row, or that table, is not rendered yet.
 */
function revealRow(id: string, framesLeft = REVEAL_FRAMES) {
    const row = document.querySelector<HTMLElement>(rowSelector(id));
    // the declaration table of a selected class sits right under its row
    const below = row?.nextElementSibling;
    const last = !row?.hasAttribute('data-defs-class') ? row : below?.hasAttribute('data-defs-decls') ? below : null;
    if (!row || !last) {
        framesLeft > 0 && requestAnimationFrame(() => revealRow(id, framesLeft - 1));
        return;
    }
    const scroller = row.closest<HTMLElement>('[data-layers-scroll]');
    if (!scroller) {
        return;
    }
    const top = row.getBoundingClientRect().top;
    const bottom = last.getBoundingClientRect().bottom;
    const s = scroller.getBoundingClientRect();
    if (top < s.top) {
        scroller.scrollTop -= s.top - top;
    } else if (bottom > s.bottom) {
        // scroll down as far as the block fits, but never hide its first row
        scroller.scrollTop += Math.min(bottom - s.bottom, top - s.top);
    }
}

/**
 * Shows an element picked in the code editor in the tree: it is selected (as a click on its row would select it),
 * the groups around it open, the panel opens, and its row scrolls into view.
 * An element outside the isolated objects cannot be shown, so Isolation Mode is left for it.
 */
export const selectInLayersAtom = atom(
    null,
    (get, set, id: string) => {
        const doc = docState.doc;
        const parsed = parseDefsItemId(id);
        if (parsed ? !isDefsItemOf(doc, id) : !findNode(doc, id)) {
            return;
        }

        const path = rowAncestorIds(doc, id);
        const isolated = getIsolationScope(get);
        const shown = !isolated.length || isolated.includes(id) || path.some((p) => isolated.includes(p));
        if (!shown) {
            set(exitIsolationToAtom, null);
        }
        const scope = shown ? isolated : [];

        if (scope.length > 1) {
            set(isolationManyOpenAtom, true);
        }
        // the isolated objects open through their own collapsed flag; every other group opens through the expanded set
        const expanded = new Set(get(expandedIdsAtom));
        const collapsed = new Set(get(isolationCollapsedAtom));
        for (const p of path) {
            if (scope.includes(p)) {
                collapsed.delete(p);
            } else {
                expanded.add(p);
            }
        }
        set(expandedIdsAtom, expanded);
        set(isolationCollapsedAtom, collapsed);

        if (parsed) {
            set(setDefsSelectionAtom, [id]);
        } else {
            set(selectLayersAtom, [id]); // hidden and locked layers stay unselected, as in the tree
            set(rangeAnchorAtom, id);
        }

        appSettings.layersPanel.open = true;
        revealRow(id);
    }
);
