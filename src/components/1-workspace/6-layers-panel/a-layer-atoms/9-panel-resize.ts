import { atom } from "jotai";
import { appSettings } from "@/store/1-ui-settings";

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
