import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { type SvgNode, findNode, walkNodes } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { getIsolationScope, isHiddenOrLocked, isolationCollapsedAtom, isolationManyOpenAtom } from "@/store/6-layers";

//---------------------------------------------------------------------------
// Row layout

/** Preview icon width; each tree level indents by one icon, so a child sits one preview to the right of its parent */
export const LAYER_ICON_PX = 24;

/** Indent per tree level */
export const ROW_INDENT_PX = LAYER_ICON_PX;

/** Left edge of the name column at depth 0: the eye and padlock cells plus the padding before the expander */
export const ROW_NAME_LEFT_PX = 2 * 28 + 4;

//---------------------------------------------------------------------------
// Expanded groups

export const expandedIdsAtom = atom<ReadonlySet<string>>(new Set<string>());

export const isExpandedFamily = atomFamily(
    (id: string) => atom((get) => get(expandedIdsAtom).has(id))
);

export const toggleExpandedAtom = atom(
    null,
    (get, set, id: string) => {
        const next = new Set(get(expandedIdsAtom));
        next.has(id) ? next.delete(id) : next.add(id);
        set(expandedIdsAtom, next);
    }
);

/** True when this isolated object was collapsed in the current isolation */
export const isIsolationCollapsedFamily = atomFamily(
    (id: string) => atom((get) => get(isolationCollapsedAtom).has(id))
);

export const toggleIsolationCollapsedAtom = atom(
    null,
    (get, set, id: string) => {
        const next = new Set(get(isolationCollapsedAtom));
        next.has(id) ? next.delete(id) : next.add(id);
        set(isolationCollapsedAtom, next);
    }
);

/** Collapse or expand the Isolation Mode row that holds several isolated objects */
export const toggleIsolationManyAtom = atom(
    null,
    (get, set) => {
        set(isolationManyOpenAtom, !get(isolationManyOpenAtom));
    }
);

export const isSelectedFamily = atomFamily(
    (id: string) => atom((get) => get(selectionAtom).includes(id))
);

//---------------------------------------------------------------------------
// Visible rows

/** Rows of the tree: the isolated objects, or the top-level elements, listed topmost first as in Adobe apps */
export function treeRootNodes(scope: readonly string[]): SvgNode[] {
    if (!scope.length) {
        return [...docState.doc.children].reverse();
    }
    const ids = new Set(scope);
    const found: SvgNode[] = [];
    walkNodes(docState.doc.children, (node) => {
        if (!ids.has(node.id)) {
            return;
        }
        found.push(node);
        return false; // a descendant of an isolated object is shown under it, not as another root
    });
    return found.reverse();
}

/**
 * Whether a group row shows its children.
 * An isolated object starts open; collapsing it is stored until the next time isolation is entered.
 * One isolated group is the Isolation Mode row, so its children follow this too.
 */
export function isOpenRow(id: string, expanded: ReadonlySet<string>, scope: readonly string[], collapsed: ReadonlySet<string>): boolean {
    return scope.includes(id) ? !collapsed.has(id) : expanded.has(id);
}

/** Ids of the rows as they are shown, top to bottom. Several isolated objects sit under a row that has no id of its own. */
function visibleRowIds(expanded: ReadonlySet<string>, scope: readonly string[], collapsed: ReadonlySet<string>, manyOpen: boolean): string[] {
    const rv: string[] = [];
    const visit = (nodes: readonly SvgNode[]) => {
        for (const node of nodes) {
            rv.push(node.id);
            if (node.kind === 'g' && isOpenRow(node.id, expanded, scope, collapsed)) {
                visit([...node.children].reverse());
            }
        }
    };
    if (!scope.length) {
        visit([...docState.doc.children].reverse());
        return rv;
    }
    // Several isolated objects are hidden while their Isolation Mode row is collapsed
    if (scope.length > 1 && !manyOpen) {
        return rv;
    }
    visit(treeRootNodes(scope));
    return rv;
}

//---------------------------------------------------------------------------
// Selection from the tree

/** Row where the last plain click happened; Shift+click selects from it */
const rangeAnchorAtom = atom<string | null>(null);

/** Hidden and locked layers cannot be selected, as on the canvas */
const selectLayersAtom = atom(
    null,
    (_get, set, ids: string[]) => {
        set(setSelectionAtom, ids.filter((id) => !isHiddenOrLocked(docState.doc, id)));
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

/** Pointer is down on a selection circle; dragging across other circles toggles each of them once */
let drag: { startId: string; base: string[]; toggled: Set<string>; moved: boolean; } | null = null;

type CirclePointer = { id: string; shift: boolean; ctrl: boolean; pointerId: number; target: Element; };

export const circlePointerDownAtom = atom(
    null,
    (get, set, e: CirclePointer) => {
        if (e.shift || e.ctrl) {
            set(rowClickAtom, e);
            return;
        }
        e.target.setPointerCapture(e.pointerId);
        drag = { startId: e.id, base: get(selectionAtom), toggled: new Set(), moved: false };
    }
);

export const circlePointerMoveAtom = atom(
    null,
    (_get, set, e: { clientX: number; clientY: number; }) => {
        if (!drag) {
            return;
        }
        const row = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-layer-id]');
        const id = row?.dataset.layerId;
        if (!id || (!drag.moved && id === drag.startId)) {
            return;
        }
        if (!drag.moved) {
            drag.moved = true;
            drag.toggled.add(drag.startId);
        }
        if (drag.toggled.has(id)) {
            return;
        }
        drag.toggled.add(id);

        const { base, toggled } = drag;
        set(selectLayersAtom, [...base.filter((s) => !toggled.has(s)), ...[...toggled].filter((t) => !base.includes(t))]);
    }
);

export const circlePointerUpAtom = atom(
    null,
    (_get, set) => {
        if (!drag) {
            return;
        }
        const { startId, moved } = drag;
        drag = null;
        if (!moved) {
            set(rowClickAtom, { id: startId, shift: false, ctrl: false });
        } else {
            set(rangeAnchorAtom, startId);
        }
    }
);

//---------------------------------------------------------------------------

/** Opens the groups around the selected elements and scrolls the first one into view (Illustrator's Locate Object) */
export const locateSelectionAtom = atom(
    null,
    (get, set) => {
        const selection = get(selectionAtom);
        const next = new Set(get(expandedIdsAtom));
        for (const id of selection) {
            for (const p of findNode(docState.doc, id)?.parents ?? []) {
                next.add(p.id);
            }
        }
        set(expandedIdsAtom, next);
        appSettings.layersPanel.open = true;

        const first = selection[0];
        first && requestAnimationFrame(
            () => document.querySelector(`[data-layer-id="${CSS.escape(first)}"]`)?.scrollIntoView({ block: 'nearest' })
        );
    }
);

//---------------------------------------------------------------------------
// Panel resize (the handle is on the left edge, so dragging left widens the panel)

export const isLayersPanelResizingAtom = atom(false);

export const MIN_LAYERS_PANEL_WIDTH = 220;

let resize: { startX: number; startWidth: number; } | null = null;

export const layersResizeDownAtom = atom(
    null,
    (_get, set, e: { clientX: number; pointerId: number; target: Element; }) => {
        e.target.setPointerCapture(e.pointerId);
        resize = { startX: e.clientX, startWidth: appSettings.layersPanel.width };
        set(isLayersPanelResizingAtom, true);
    }
);

export const layersResizeMoveAtom = atom(
    null,
    (_get, _set, e: { clientX: number; }) => {
        if (resize) {
            const max = Math.max(MIN_LAYERS_PANEL_WIDTH, window.innerWidth - 320);
            appSettings.layersPanel.width = Math.round(Math.min(max, Math.max(MIN_LAYERS_PANEL_WIDTH, resize.startWidth - (e.clientX - resize.startX))));
        }
    }
);

export const layersResizeUpAtom = atom(
    null,
    (_get, set) => {
        resize = null;
        set(isLayersPanelResizingAtom, false);
    }
);
