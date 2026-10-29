import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { motionValue } from "motion/react";
import { findNode, topmostIds } from "@/svg-core";
import { docState } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { getIsolatedId, layerName } from "@/store/6-layers";
import { type DropPlace, type LayerDrop, canDropLayers, moveLayers } from "@/store/7-layers-edit";
import { ROW_INDENT_PX, ROW_NAME_LEFT_PX, expandedIdsAtom } from "../9-atoms-layers-panel";

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

type Gesture = {
    id: string;                  // row where the pointer went down
    row: Element;
    pointerId: number;
    startX: number;
    startY: number;
    ids: string[] | null;        // set once the pointer moved far enough to start the drag
    drop: LayerDrop | null;
};

let gesture: Gesture | null = null;

const DRAG_THRESHOLD_PX = 4;

type RowPointerDown = { id: string; button: number; pointerId: number; clientX: number; clientY: number; target: Element; row: Element; };

/** Pointer down on a row; the drag starts only after a small move, so clicks and double-clicks keep working */
export const rowDragDownAtom = atom(
    null,
    (get, _set, e: RowPointerDown) => {
        gesture = null;
        if (e.button !== 0 || e.target.closest('[data-row-control]') || e.id === getIsolatedId(get)) {
            return;
        }
        gesture = { id: e.id, row: e.row, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, ids: null, drop: null };
    }
);

type TreePointerMove = { pointerId: number; buttons: number; clientX: number; clientY: number; };

export const rowDragMoveAtom = atom(
    null,
    (get, set, e: TreePointerMove) => {
        if (!gesture || e.pointerId !== gesture.pointerId) {
            return;
        }
        if (!e.buttons) {
            set(rowDragCancelAtom);
            return;
        }

        if (!gesture.ids) {
            if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) < DRAG_THRESHOLD_PX) {
                return;
            }
            const selection = get(selectionAtom);
            gesture.ids = selection.includes(gesture.id) ? topmostIds(docState.doc, selection) : [gesture.id];
            gesture.row.setPointerCapture(gesture.pointerId);
            ghostX.set(e.clientX);
            ghostY.set(e.clientY);
            set(reorderDragAtom, { ids: gesture.ids, label: dragLabel(gesture.ids) });
        }

        ghostX.set(e.clientX);
        ghostY.set(e.clientY);

        const container = gesture.row.closest<HTMLElement>('[data-layers-scroll]');
        container && autoScroll(container, e.clientY);

        const hit = dropAt(e.clientX, e.clientY, container, getIsolatedId(get));
        const valid = hit && canDropLayers(docState.doc, gesture.ids, hit.drop);
        gesture.drop = valid ? hit.drop : null;
        set(dropIndicatorAtom, valid && container ? indicatorFor(hit.anchor, hit.drop.place, hit.depth, container) : null);
    }
);

export const rowDragUpAtom = atom(
    null,
    (get, set) => {
        const g = gesture;
        set(rowDragCancelAtom);
        if (!g?.ids) {
            return;
        }
        swallowNextClick();

        if (g.drop && moveLayers(g.ids, g.drop) && g.drop.place === 'inside') {
            set(expandedIdsAtom, new Set([...get(expandedIdsAtom), g.drop.targetId]));
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

type DropHit = {
    anchor: HTMLElement;         // row whose edge the indicator line is drawn on
    drop: LayerDrop;
    depth: number;               // indent of the insertion line
};

/**
 * Row under the pointer and the drop it means. Groups have three zones (above, inside, below), other rows two.
 * Below an open group means on top of its children, which are listed right under it. The isolated group only takes drops inside.
 * The empty space under the last row counts as below that row, so the end of the tree stays reachable.
 */
function dropAt(x: number, y: number, container: HTMLElement | null, isolatedId: string | null): DropHit | undefined {
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
    if (targetId === isolatedId || (place === 'below' && row.dataset.layerOpen === 'true')) {
        place = 'inside';
    }

    // The gap under a row can belong to several levels: the pointer's x picks one, so a drop under the last
    // child of an expanded group lands inside that group when the pointer is over the children, but after the
    // group itself when the pointer moves left, toward that group's own indent.
    if (place === 'below') {
        return dropBelow(rows, row, x, rowDepth, isolatedId);
    }
    return { anchor: row, drop: { targetId, place }, depth: rowDepth };
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

function dropBelow(rows: HTMLElement[], row: HTMLElement, x: number, rowDepth: number, isolatedId: string | null): DropHit {
    const index = rows.indexOf(row);
    const next = rows[index + 1];
    const nextDepth = next ? Number(next.dataset.layerDepth ?? 0) : 0;
    const minDepth = Math.max(nextDepth, isolationFloor(rows, isolatedId));

    const rel = x - row.getBoundingClientRect().left - ROW_NAME_LEFT_PX;
    const depth = Math.min(rowDepth, Math.max(minDepth, Math.floor(rel / ROW_INDENT_PX)));

    const ancestor = depth < rowDepth ? rows.slice(0, index).findLast((r) => Number(r.dataset.layerDepth ?? 0) === depth) : undefined;
    return {
        anchor: row,
        drop: { targetId: ancestor?.dataset.layerId ?? row.dataset.layerId!, place: 'below' },
        depth: ancestor ? depth : rowDepth,
    };
}

/** Levels shallower than this sit outside the isolated group, and drops may not leave it */
function isolationFloor(rows: HTMLElement[], isolatedId: string | null): number {
    const root = isolatedId ? rows.find((r) => r.dataset.layerId === isolatedId) : undefined;
    return root ? Number(root.dataset.layerDepth ?? 0) + 1 : 0;
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
