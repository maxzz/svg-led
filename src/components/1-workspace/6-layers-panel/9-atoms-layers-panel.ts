import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { type DefsItem, type SvgDoc, type SvgNode, defsItemId, defsItemsOf, findNode, isDefsItemOf, parseDefsItemId, plainName, walkNodes } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { defsSelectionAtom, selectionAtom, setDefsSelectionAtom, setSelectionAtom } from "@/store/4-editor";
import { exitIsolationToAtom, getIsolationScope, isHiddenOrLocked, isLocked, isolationCollapsedAtom, isolationManyOpenAtom } from "@/store/6-layers";

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

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------

/** Ids of the `<defs>` items with children, at any depth, appended to `out` */
export function defsExpandableIds(defsId: string, items: readonly DefsItem[], out: string[] = []): string[] {
    for (const item of items) {
        if (item.kind === 'element' && item.children.length) {
            out.push(defsItemId(defsId, item.part));
            defsExpandableIds(defsId, item.children, out);
        }
    }
    return out;
}

const isDefsNode = (node: SvgNode): node is Extract<SvgNode, { kind: 'passthrough'; }> => node.kind === 'passthrough' && plainName(node.tag).toLowerCase() === 'defs';

/** Ids of the groups, `<defs>` elements and `<defs>` items under a node, at any depth (the node itself is not included) */
export function expandableDescendantIds(node: SvgNode, out: string[] = []): string[] {
    if (node.kind === 'g') {
        for (const child of node.children) {
            if (child.kind === 'g' || isDefsNode(child)) {
                out.push(child.id);
            }
            expandableDescendantIds(child, out);
        }
    } else if (isDefsNode(node)) {
        defsExpandableIds(node.id, defsItemsOf(node.inner), out);
    }
    return out;
}

//---------------------------------------------------------------------------

/**
 * Opens or closes a row and every expandable row under it (Ctrl+click on an expander).
 * `root` marks the isolated object whose open state is kept in `isolationCollapsedAtom`.
 */
export const setSubtreeOpenAtom = atom(
    null,
    (get, set, { id, root, open, ids }: { id: string; root: boolean; open: boolean; ids: string[]; }) => {
        const expanded = new Set(get(expandedIdsAtom));
        for (const d of ids) {
            open ? expanded.add(d) : expanded.delete(d);
        }
        if (root) {
            const collapsed = new Set(get(isolationCollapsedAtom));
            open ? collapsed.delete(id) : collapsed.add(id);
            set(isolationCollapsedAtom, collapsed);
        } else {
            open ? expanded.add(id) : expanded.delete(id);
        }
        set(expandedIdsAtom, expanded);
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

/** Ids of every group that holds a selected item at any depth, whether it is collapsed or not; a selected `<defs>` item counts its `<defs>` element and that element's parents */
const selectedAncestorIdsAtom = atom((get) => {
    const ids = new Set<string>();
    for (const id of get(selectionAtom)) {
        for (const p of findNode(docState.doc, id)?.parents ?? []) {
            ids.add(p.id);
        }
    }
    for (const id of get(defsSelectionAtom)) {
        const defsId = parseDefsItemId(id)?.defsId;
        if (!defsId) {
            continue;
        }
        ids.add(defsId);
        for (const p of findNode(docState.doc, defsId)?.parents ?? []) {
            ids.add(p.id);
        }
    }
    return ids;
});

/** True when a group row should show the marker that its contents are selected */
export const containsSelectedFamily = atomFamily(
    (id: string) => atom((get) => get(selectedAncestorIdsAtom).has(id))
);

/**
 * The item ids (of `defsItemId`) on the way from the `<defs>` items to the one with `part`, outermost first;
 * undefined when no item has that part
 */
function defsAncestorIdsOf(defsId: string, items: readonly DefsItem[], part: string, trail: string[] = []): string[] | undefined {
    for (const item of items) {
        if (item.part === part) {
            return trail;
        }
        if (item.kind === 'element') {
            const found = defsAncestorIdsOf(defsId, item.children, part, [...trail, defsItemId(defsId, item.part)]);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

/** Ids of the `<defs>` items that hold a selected `<defs>` item at any depth */
const selectedDefsAncestorIdsAtom = atom((get) => {
    const ids = new Set<string>();
    for (const id of get(defsSelectionAtom)) {
        const parsed = parseDefsItemId(id);
        const node = parsed && findNode(docState.doc, parsed.defsId)?.node;
        if (!parsed || node?.kind !== 'passthrough') {
            continue;
        }
        for (const a of defsAncestorIdsOf(parsed.defsId, defsItemsOf(node.inner), parsed.part) ?? []) {
            ids.add(a);
        }
    }
    return ids;
});

/** True when a `<defs>` item (a `<style>` or other element) should show the marker that a selected item is inside it */
export const containsSelectedDefsFamily = atomFamily(
    (id: string) => atom((get) => get(selectedDefsAncestorIdsAtom).has(id))
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
const selectLayersAtom = atom(
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

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------
