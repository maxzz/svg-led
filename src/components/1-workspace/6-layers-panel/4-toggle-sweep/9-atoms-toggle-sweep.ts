import { atom } from "jotai";
import { findNode } from "@/svg-core";
import { commitHistory, docState } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { type LayerFlag, hasLayerFlag, setLayerFlag } from "@/store/7-layers-edit";

/**
 * Press on an eye or padlock and drag up or down: every row crossed gets the state the first row switched to,
 * as in Illustrator. The whole sweep is one undo step.
 */
type Sweep = {
    flag: LayerFlag;
    on: boolean;
    container: HTMLElement | null;
    lastY: number;
    touched: Set<string>;
};

let sweep: Sweep | null = null;

type SweepDown = { id: string; flag: LayerFlag; button: number; pointerId: number; clientY: number; target: Element; };

export const sweepDownAtom = atom(
    null,
    (_get, _set, e: SweepDown) => {
        const node = findNode(docState.doc, e.id)?.node;
        if (e.button !== 0 || !node) {
            return;
        }
        e.target.setPointerCapture(e.pointerId);
        const on = !hasLayerFlag(node, e.flag);
        sweep = { flag: e.flag, on, container: e.target.closest<HTMLElement>('[data-layers-scroll]'), lastY: e.clientY, touched: new Set([e.id]) };
        setLayerFlag(e.id, e.flag, on);
    }
);

export const sweepMoveAtom = atom(
    null,
    (_get, _set, e: { clientY: number; }) => {
        if (!sweep?.container) {
            return;
        }
        const bounds = sweep.container.getBoundingClientRect();
        const y = Math.min(bounds.bottom - 1, Math.max(bounds.top, e.clientY));
        for (const id of rowIdsBetween(sweep.container, sweep.lastY, y)) {
            if (!sweep.touched.has(id)) {
                sweep.touched.add(id);
                setLayerFlag(id, sweep.flag, sweep.on);
            }
        }
        sweep.lastY = y;
    }
);

/** Ends the sweep; hidden or locked layers leave the selection, as with the single-row buttons */
export const sweepUpAtom = atom(
    null,
    (get, set) => {
        if (!sweep) {
            return;
        }
        const { on, touched } = sweep;
        sweep = null;
        commitHistory();

        if (on) {
            const selection = get(selectionAtom);
            const next = selection.filter((id) => !touched.has(id));
            next.length !== selection.length && set(setSelectionAtom, next);
        }
    }
);

/** Rows between two pointer positions, so a fast drag that skips rows between move events still switches them */
function rowIdsBetween(container: HTMLElement, y0: number, y1: number): string[] {
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);
    const rv: string[] = [];
    for (const row of container.querySelectorAll<HTMLElement>('[data-layer-id]')) {
        const rect = row.getBoundingClientRect();
        if (rect.bottom > top && rect.top <= bottom && row.dataset.layerId) {
            rv.push(row.dataset.layerId);
        }
    }
    return rv;
}
