import { atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { appSettings } from "@/store/1-ui-settings";
import { canvasSizeAtom, rectToScreen, viewportAtom } from "@/store/4-editor";
import { docProxyAtom } from "@/store/6-layers";
import { type RulerTick, rulerSteps, rulerTicks } from "./1-ruler-ticks";

/** Screen gap between the viewBox frame and the ruler baseline */
export const RULER_GAP_PX = 3;

export type RulerGeometry = {
    base: number;                // Screen coordinate of the baseline across the ruler (y for the top ruler, x for the left one)
    from: number;                // Visible part of the baseline along the ruler
    to: number;
    ticks: RulerTick[];
};

export type RulersGeometry = { top: RulerGeometry; left: RulerGeometry; };

//---------------------------------------------------------------------------

const settingsProxyAtom = atomWithProxy(appSettings);

/** Rulers belong to the viewBox frame, so they show only together with it */
export const rulersVisibleAtom = atom(
    (get) => {
        const { showViewBox, showRulers } = get(settingsProxyAtom).prefs;
        return showViewBox && showRulers;
    }
);

/** Valtio keeps an unchanged viewBox snapshot, so the rulers skip document edits that leave it alone */
const rulersViewBoxAtom = atom((get) => get(docProxyAtom).doc.viewBox);

/** Both rulers in screen space, or null when hidden */
export const rulersGeometryAtom = atom(
    (get): RulersGeometry | null => {
        const vb = get(rulersViewBoxAtom);
        if (!get(rulersVisibleAtom) || !vb) {
            return null;
        }

        const vp = get(viewportAtom);
        const size = get(canvasSizeAtom);
        const r = rectToScreen(vp, vb);
        const steps = rulerSteps(vp.zoom);

        return {
            top: {
                base: r.y - RULER_GAP_PX,
                from: Math.max(r.x, 0),
                to: Math.min(r.x + r.width, size.width),
                ticks: rulerTicks(steps, { from: vb.x, to: vb.x + vb.width, zoom: vp.zoom, offset: vp.x, clipFrom: 0, clipTo: size.width }),
            },
            left: {
                base: r.x - RULER_GAP_PX,
                from: Math.max(r.y, 0),
                to: Math.min(r.y + r.height, size.height),
                ticks: rulerTicks(steps, { from: vb.y, to: vb.y + vb.height, zoom: vp.zoom, offset: vp.y, clipFrom: 0, clipTo: size.height }),
            },
        };
    }
);
