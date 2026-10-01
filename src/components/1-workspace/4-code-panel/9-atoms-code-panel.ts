import { atom } from "jotai";
import { appSettings } from "@/store/1-ui-settings";

export const MIN_PANEL_WIDTH = 260;

/** True while the resize handle is dragged; the slide animation is off then */
export const isPanelResizingAtom = atom(false);

let drag: { startX: number; startWidth: number; } | null = null;

export const panelResizeDownAtom = atom(
    null,
    (_get, set, e: { clientX: number; pointerId: number; target: EventTarget; }) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        drag = { startX: e.clientX, startWidth: appSettings.codePanel.width };
        set(isPanelResizingAtom, true);
    }
);

export const panelResizeMoveAtom = atom(
    null,
    (_get, _set, e: { clientX: number; }) => {
        if (drag) {
            const max = Math.max(MIN_PANEL_WIDTH, window.innerWidth - 320);
            appSettings.codePanel.width = Math.round(Math.min(max, Math.max(MIN_PANEL_WIDTH, drag.startWidth + e.clientX - drag.startX)));
        }
    }
);

export const panelResizeUpAtom = atom(
    null,
    (_get, set) => {
        drag = null;
        set(isPanelResizingAtom, false);
    }
);
