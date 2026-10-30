import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { motionValue } from "motion/react";
import { doReorderScrapAtom } from "../9-types-scraps";

/** Scrap being dragged in the list; null when no drag is running. The ghost shows its name */
export type ReorderDrag = { name: string };

export const reorderDragAtom = atom<ReorderDrag | null>(null);

export const isDraggedFamily = atomFamily(
    (name: string) => atom((get) => get(reorderDragAtom)?.name === name)
);

/** Where the dragged scrap would land, in the list element's coordinates */
export type DropIndicator = { top: number };

export const dropIndicatorAtom = atom<DropIndicator | null>(null);

/** Pointer position for the ghost; motion values, so following the pointer does not re-render React */
export const ghostX = motionValue(0);
export const ghostY = motionValue(0);

//---------------------------------------------------------------------------

type Gesture = {
    name: string;                // row where the pointer went down
    row: Element;
    pointerId: number;
    startX: number;
    startY: number;
    started: boolean;            // set once the pointer moved far enough to start the drag
    index: number | null;        // final list index while the pointer is over the list
};

let gesture: Gesture | null = null;

const DRAG_THRESHOLD_PX = 4;

type RowPointerDown = { name: string; button: number; pointerId: number; clientX: number; clientY: number; target: Element; row: Element };

/** Pointer down on a row; the drag starts only after a small move, so clicks and double-clicks keep working */
export const rowDragDownAtom = atom(
    null,
    (_get, _set, e: RowPointerDown) => {
        gesture = null;
        if (e.button !== 0 || e.target.closest('[data-row-control]')) {
            return;
        }
        gesture = { name: e.name, row: e.row, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, started: false, index: null };
    }
);

type ListPointerMove = { pointerId: number; buttons: number; clientX: number; clientY: number; viewport: HTMLElement; };

export const rowDragMoveAtom = atom(
    null,
    (get, set, e: ListPointerMove) => {
        if (!gesture || e.pointerId !== gesture.pointerId) {
            return;
        }
        if (!e.buttons) {
            set(rowDragCancelAtom);
            return;
        }

        if (!gesture.started) {
            if (Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY) < DRAG_THRESHOLD_PX) {
                return;
            }
            gesture.started = true;
            try {
                gesture.row.setPointerCapture(gesture.pointerId);
            } catch {
                // already released, or not a real pointer; the list still follows moves that bubble to it
            }
            ghostX.set(e.clientX);
            ghostY.set(e.clientY);
            set(reorderDragAtom, { name: gesture.name });
        }

        ghostX.set(e.clientX);
        ghostY.set(e.clientY);

        const viewport = e.viewport;
        const list = gesture.row.closest<HTMLElement>('[data-scraps-list]');
        autoScroll(viewport, e.clientY);

        const rows = list ? [...list.querySelectorAll<HTMLElement>('[data-scrap-name]')] : [];
        const hit = viewport && list ? rowAt(rows, viewport, e.clientX, e.clientY) : undefined;
        const from = rows.findIndex((row) => row.dataset.scrapName === gesture?.name);
        if (!hit || !list || from < 0) {
            gesture.index = null;
            get(dropIndicatorAtom) && set(dropIndicatorAtom, null);
            return;
        }

        const place = placeOn(hit, e.clientY);
        gesture.index = targetIndex(from, rows.indexOf(hit), place);
        const top = indicatorTop(hit, place, list);
        if (get(dropIndicatorAtom)?.top !== top) {
            set(dropIndicatorAtom, { top });
        }
    }
);

export const rowDragUpAtom = atom(
    null,
    (_get, set) => {
        const g = gesture;
        set(rowDragCancelAtom);
        if (!g?.started) {
            return;
        }
        swallowNextClick();
        if (g.index !== null) {
            set(doReorderScrapAtom, { name: g.name, index: g.index });
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

/** Final index of the dragged row. The list still includes it, so an insertion after it shifts back by one */
function targetIndex(from: number, over: number, place: 'above' | 'below'): number {
    let index = place === 'above' ? over : over + 1;
    if (from < index) {
        index -= 1;
    }
    return index;
}

function placeOn(row: HTMLElement, y: number): 'above' | 'below' {
    const rect = row.getBoundingClientRect();
    return (y - rect.top) / Math.max(rect.height, 1) < 0.5 ? 'above' : 'below';
}

/**
 * Row under the pointer, or the nearest one when the pointer is in the list's padding or the gap between rows.
 * Outside the scrollport there is no drop.
 */
function rowAt(rows: HTMLElement[], viewport: HTMLElement, x: number, y: number): HTMLElement | undefined {
    const bounds = viewport.getBoundingClientRect();
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
        return;
    }
    let nearest: HTMLElement | undefined;
    let nearestDist = Infinity;
    for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
            return row;
        }
        const dist = y < rect.top ? rect.top - y : y - rect.bottom;
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = row;
        }
    }
    return nearest;
}

/** Line above or below the row, in the list element's coordinates */
function indicatorTop(row: HTMLElement, place: 'above' | 'below', list: HTMLElement): number {
    const rect = row.getBoundingClientRect();
    const top = rect.top - list.getBoundingClientRect().top;
    return place === 'above' ? top : top + rect.height;
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

/** The click that ends a drag must not also select the row it lands on */
function swallowNextClick(): void {
    const swallow = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
}
