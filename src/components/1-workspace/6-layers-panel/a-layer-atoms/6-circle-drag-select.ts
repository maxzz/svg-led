import { atom } from "jotai";
import { selectionAtom } from "@/store/4-editor";
import { rangeAnchorAtom, rowClickAtom, selectLayersAtom } from "./5-row-click";

//---------------------------------------------------------------------------
// Drag selection across selection circles

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
