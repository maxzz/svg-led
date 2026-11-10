import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { motionValue } from "motion/react";
import { type DefsClassDrop, type DefsElementDrop, defsItemId, findNode, topmostIds } from "@/svg-core";
import { docState } from "@/store/3-document";
import { defsSelectionAtom, selectionAtom } from "@/store/4-editor";
import { getIsolationScope, layerName } from "@/store/6-layers";
import { type DropPlace, type LayerDrop, canDropLayers, moveDefsClass, moveDefsElement, moveLayers } from "@/store/7-layers-edit";
import { ROW_INDENT_PX, ROW_NAME_LEFT_PX, expandedIdsAtom } from "../a-layer-atoms";

/** Layers being dragged in the tree and the text of the ghost under the pointer; null when no drag is running */
export type ReorderDrag = { ids: readonly string[]; label: string; };

export const reorderDragAtom = atom<ReorderDrag | null>(null);

export const isDraggedFamily = atomFamily(
    (id: string) => atom((get) => get(reorderDragAtom)?.ids.includes(id) ?? false)
);

/** Where the dragged layers would land, in the scroll container's content coordinates */
export type DropIndicator = { top: number; left: number; height: number; box: boolean; };

export const dropIndicatorAtom = atom<DropIndicator | null>(null);

/** Pointer position for the ghost; motion values, so following the pointer does not re-render React */
export const ghostX = motionValue(0);
export const ghostY = motionValue(0);

//---------------------------------------------------------------------------

/** A `<defs>` item being dragged: a top-level element of a `<defs>` element (a `<style>` included), or a class of a `<style>` */
export type DefsDragSource =
    | { kind: 'element'; defsId: string; root: number; label: string; }
    | { kind: 'class'; defsId: string; styleIndex: number; name: string; label: string; };

/** Where a dragged `<defs>` item lands */
type DefsDrop =
    | { kind: 'element'; defsId: string; drop: DefsElementDrop; }
    | { kind: 'class'; defsId: string; drop: DefsClassDrop; };

type Gesture = {
    row: Element;                // row where the pointer went down
    pointerId: number;
    startX: number;
    startY: number;
    started: boolean;            // set once the pointer moved far enough to start the drag
    layers: { id: string; ids: string[]; drop: LayerDrop | null; } | null;   // a drag of layer rows
    defs: { source: DefsDragSource; drop: DefsDrop | null; } | null;         // a drag of a `<defs>` item
};

let gesture: Gesture | null = null;

const DRAG_THRESHOLD_PX = 4;

type RowPointerDown = { id: string; button: number; pointerId: number; clientX: number; clientY: number; target: Element; row: Element; };

/** Pointer down on a row; the drag starts only after a small move, so clicks and double-clicks keep working */
export const rowDragDownAtom = atom(
    null,
    (get, _set, e: RowPointerDown) => {
        gesture = null;
        if (e.button !== 0 || e.target.closest('[data-row-control]') || getIsolationScope(get).includes(e.id)) {
            return;
        }
        gesture = { row: e.row, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, started: false, layers: { id: e.id, ids: [], drop: null }, defs: null };
    }
);

type DefsPointerDown = { source: DefsDragSource; button: number; pointerId: number; clientX: number; clientY: number; target: Element; row: Element; };

/** Pointer down on a `<defs>` item; like `rowDragDownAtom`, the drag starts after a small move */
export const defsDragDownAtom = atom(
    null,
    (_get, _set, e: DefsPointerDown) => {
        gesture = null;
        if (e.button !== 0 || e.target.closest('[data-row-control]')) {
            return;
        }
        gesture = { row: e.row, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, started: false, layers: null, defs: { source: e.source, drop: null } };
    }
);

type TreePointerMove = { pointerId: number; buttons: number; clientX: number; clientY: number; };

export const rowDragMoveAtom = atom(
    null,
    (get, set, e: TreePointerMove) => {
        const g = gesture;
        if (!g || e.pointerId !== g.pointerId) {
            return;
        }
        if (!e.buttons) {
            set(rowDragCancelAtom);
            return;
        }

        if (!g.started) {
            if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < DRAG_THRESHOLD_PX) {
                return;
            }
            g.started = true;
            g.row.setPointerCapture(g.pointerId);
            if (g.layers) {
                const selection = get(selectionAtom);
                g.layers.ids = selection.includes(g.layers.id) ? topmostIds(docState.doc, selection) : [g.layers.id];
                set(reorderDragAtom, { ids: g.layers.ids, label: dragLabel(g.layers.ids) });
            } else if (g.defs) {
                set(reorderDragAtom, { ids: [], label: g.defs.source.label });
            }
        }

        ghostX.set(e.clientX);
        ghostY.set(e.clientY);

        const container = g.row.closest<HTMLElement>('[data-layers-scroll]');
        container && autoScroll(container, e.clientY);

        if (g.defs) {
            const hit = dropDefsAt(e.clientX, e.clientY, container, g.defs.source);
            g.defs.drop = hit?.drop ?? null;
            set(dropIndicatorAtom, hit && container ? indicatorFor(hit.anchor, hit.place, hit.depth, container) : null);
            return;
        }
        if (!g.layers) {
            return;
        }

        const hit = dropAt(e.clientX, e.clientY, container, getIsolationScope(get));
        const valid = hit && canDropLayers(docState.doc, g.layers.ids, hit.drop);
        g.layers.drop = valid ? hit.drop : null;
        set(dropIndicatorAtom, valid && container ? indicatorFor(hit.anchor, hit.drop.place, hit.depth, container) : null);
    }
);

export const rowDragUpAtom = atom(
    null,
    (get, set) => {
        const g = gesture;
        set(rowDragCancelAtom);
        if (!g?.started) {
            return;
        }
        swallowNextClick();

        if (g.defs) {
            const d = g.defs.drop;
            if (d && moveDefsItem(g.defs.source, d)) {
                set(defsSelectionAtom, []);
                if (d.kind === 'class' && d.drop.place === 'end') {
                    // show the class that was dropped into a collapsed style
                    set(expandedIdsAtom, new Set([...get(expandedIdsAtom), defsItemId(d.defsId, String(d.drop.styleIndex))]));
                }
            }
            return;
        }

        const layers = g.layers;
        if (!layers) {
            return;
        }
        if (layers.drop && moveLayers(layers.ids, layers.drop) && layers.drop.place === 'inside') {
            set(expandedIdsAtom, new Set([...get(expandedIdsAtom), layers.drop.targetId]));
        }
    }
);

export const rowDragCancelAtom = atom(
    null,
    (_get, set) => {
        gesture = null;
        set(reorderDragAtom, null);
        set(dropIndicatorAtom, null);
    }
);

//---------------------------------------------------------------------------

function dragLabel(ids: readonly string[]): string {
    const node = ids.length === 1 ? findNode(docState.doc, ids[0])?.node : undefined;
    return node ? layerName(node) : `${ids.length} layers`;
}

/** Moves a `<defs>` item to its drop; the source and the drop must be of the same kind */
function moveDefsItem(source: DefsDragSource, d: DefsDrop): boolean {
    if (source.kind === 'element' && d.kind === 'element') {
        return moveDefsElement({ defsId: source.defsId, root: source.root }, { defsId: d.defsId, drop: d.drop });
    }
    if (source.kind === 'class' && d.kind === 'class') {
        return moveDefsClass({ defsId: source.defsId, styleIndex: source.styleIndex, name: source.name }, { defsId: d.defsId, drop: d.drop });
    }
    return false;
}

type DropHit = {
    anchor: HTMLElement;         // row whose edge the indicator line is drawn on
    drop: LayerDrop;
    depth: number;               // indent of the insertion line
};

type DefsHit = {
    anchor: HTMLElement;
    place: DropPlace;
    depth: number;
    drop: DefsDrop;
};

/**
 * Row under the pointer and the drop it means. Groups have three zones (above, inside, below), other rows two.
 * Below an open group means on top of its children, which are listed right under it. The isolated group only takes drops inside.
 * The empty space under the last row counts as below that row, so the end of the tree stays reachable.
 */
function dropAt(x: number, y: number, container: HTMLElement | null, scope: readonly string[]): DropHit | undefined {
    if (!container) {
        return;
    }
    const rows = [...container.querySelectorAll<HTMLElement>('[data-layer-id]')];
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-layer-id]');
    const row = hit && container.contains(hit) ? hit : rowPastEnd(rows, container, x, y);
    const targetId = row?.dataset.layerId;
    if (!row || !targetId) {
        return;
    }

    const rect = row.getBoundingClientRect();
    const f = (y - rect.top) / Math.max(rect.height, 1);
    const isGroup = row.dataset.layerGroup === 'true';
    const rowDepth = Number(row.dataset.layerDepth ?? 0);

    let place: DropPlace = isGroup
        ? f < 0.25 ? 'above' : f > 0.75 ? 'below' : 'inside'
        : f < 0.5 ? 'above' : 'below';
    if ((scope.includes(targetId) && isGroup) || (place === 'below' && row.dataset.layerOpen === 'true')) {
        place = 'inside';
    }

    // The gap under a row can belong to several levels: the pointer's x picks one, so a drop under the last
    // child of an expanded group lands inside that group when the pointer is over the children, but after the
    // group itself when the pointer moves left, toward that group's own indent.
    if (place === 'below') {
        return dropBelow(rows, row, x, rowDepth, scope);
    }
    return { anchor: row, drop: { targetId, place }, depth: rowDepth };
}

/**
 * The `<defs>` item under the pointer and the drop it means. An element goes above or below a top-level element of a `<defs>`
 * element, or into the `<defs>` row (at its end). A class goes above or below another class, or into a `<style>` row (at its end).
 */
function dropDefsAt(x: number, y: number, container: HTMLElement | null, source: DefsDragSource): DefsHit | undefined {
    if (!container) {
        return;
    }
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-defs-drop]');
    const defsId = hit?.dataset.defsId;
    if (!hit || !defsId || !container.contains(hit)) {
        return;
    }
    const kind = hit.dataset.defsDrop;
    const rect = hit.getBoundingClientRect();
    const above = (y - rect.top) / Math.max(rect.height, 1) < 0.5;
    const place: 'above' | 'below' = above ? 'above' : 'below';
    const depth = Number(hit.dataset.defsDepth ?? 0);

    if (source.kind === 'element') {
        if (kind === 'container') {
            return { anchor: hit, place: 'inside', depth, drop: { kind: 'element', defsId, drop: { place: 'end' } } };
        }
        const root = hit.dataset.defsRoot;
        if (root === undefined || (kind !== 'element' && kind !== 'style')) {
            return;
        }
        if (defsId === source.defsId && Number(root) === source.root) {
            return; // the element itself
        }
        return { anchor: hit, place, depth, drop: { kind: 'element', defsId, drop: { ordinal: Number(root), place } } };
    }

    const styleIndex = Number(hit.dataset.defsStyle);
    if (kind === 'class') {
        const name = hit.dataset.defsName ?? '';
        if (defsId === source.defsId && styleIndex === source.styleIndex && name === source.name) {
            return; // the class itself
        }
        return { anchor: hit, place, depth, drop: { kind: 'class', defsId, drop: { styleIndex, name, place } } };
    }
    if (kind === 'style') {
        return { anchor: hit, place: 'inside', depth, drop: { kind: 'class', defsId, drop: { styleIndex, place: 'end' } } };
    }
    return;
}

/** The last row, when the pointer is in the panel's empty space under the tree */
function rowPastEnd(rows: HTMLElement[], container: HTMLElement, x: number, y: number): HTMLElement | undefined {
    const last = rows.at(-1);
    const bounds = container.getBoundingClientRect();
    if (last && y > last.getBoundingClientRect().bottom && y <= bounds.bottom && x >= bounds.left && x <= bounds.right) {
        return last;
    }
    return undefined;
}

function dropBelow(rows: HTMLElement[], row: HTMLElement, x: number, rowDepth: number, scope: readonly string[]): DropHit {
    const index = rows.indexOf(row);
    const next = rows[index + 1];
    const nextDepth = next ? Number(next.dataset.layerDepth ?? 0) : 0;
    const minDepth = Math.max(nextDepth, isolationFloor(rows, scope));

    const rel = x - row.getBoundingClientRect().left - ROW_NAME_LEFT_PX;
    const depth = Math.min(rowDepth, Math.max(minDepth, Math.floor(rel / ROW_INDENT_PX)));

    const ancestor = depth < rowDepth ? rows.slice(0, index).findLast((r) => Number(r.dataset.layerDepth ?? 0) === depth) : undefined;
    return {
        anchor: row,
        drop: { targetId: ancestor?.dataset.layerId ?? row.dataset.layerId!, place: 'below' },
        depth: ancestor ? depth : rowDepth,
    };
}

/** Levels shallower than this sit outside the isolated objects, and drops may not leave them */
function isolationFloor(rows: HTMLElement[], scope: readonly string[]): number {
    let floor = Infinity;
    for (const id of scope) {
        const root = rows.find((r) => r.dataset.layerId === id);
        if (root) {
            floor = Math.min(floor, Number(root.dataset.layerDepth ?? 0) + 1);
        }
    }
    return Number.isFinite(floor) ? floor : 0;
}

/** Line above or below the row at the insertion's indent, or a box around a group row for drops inside it */
function indicatorFor(row: HTMLElement, place: DropPlace, depth: number, container: HTMLElement): DropIndicator {
    const rect = row.getBoundingClientRect();
    const top = rect.top - container.getBoundingClientRect().top + container.scrollTop;
    if (place === 'inside') {
        return { top, left: ROW_NAME_LEFT_PX, height: rect.height, box: true };
    }
    return { top: place === 'above' ? top : top + rect.height, left: ROW_NAME_LEFT_PX + depth * ROW_INDENT_PX, height: 0, box: false };
}

function autoScroll(container: HTMLElement, y: number): void {
    const rect = container.getBoundingClientRect();
    if (y < rect.top + AUTO_SCROLL_EDGE_PX) {
        container.scrollTop -= AUTO_SCROLL_STEP_PX;
    } else if (y > rect.bottom - AUTO_SCROLL_EDGE_PX) {
        container.scrollTop += AUTO_SCROLL_STEP_PX;
    }
}

const AUTO_SCROLL_EDGE_PX = 24;
const AUTO_SCROLL_STEP_PX = 10;

/** The click that ends a drag must not also select the row it started on */
function swallowNextClick(): void {
    const swallow = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
}
