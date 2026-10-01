import { atom } from "jotai";
import { toast } from "sonner";
import { type Padding } from "@/svg-core";
import { atomWithDialogOptions } from "@/store/2-persist";
import { fitNodesToViewBox, fitViewBoxToNodes, topLevelIds } from "@/store/3-document";
import { selectionAtom, zoomToFitAtom } from "@/store/4-editor";

export type FitViewBoxDialogOptions = {
    linked: boolean;             // one padding value for all sides
    top: number;
    right: number;
    bottom: number;
    left: number;
    keepAspect: boolean;
    center: boolean;
};

/** What the dialog fits: selected elements into the viewBox, or the viewBox around the selection/content */
export type FitViewBoxMode = 'selection-into-viewbox' | 'viewbox-to-selection' | 'viewbox-to-content';

export const fitViewBoxDialogAtom = atom<FitViewBoxMode | null>(null);

export const fitViewBoxOptionsAtom = atomWithDialogOptions<FitViewBoxDialogOptions>('fit-viewbox', {
    linked: true,
    top: 16,
    right: 16,
    bottom: 16,
    left: 16,
    keepAspect: true,
    center: true,
});

export type PaddingSide = keyof Padding;

/** With linked sides, editing one side sets all four */
export const setPaddingSideAtom = atom(
    null,
    (get, set, { side, value }: { side: PaddingSide; value: number; }) => {
        const v = Number.isFinite(value) ? value : 0;
        set(fitViewBoxOptionsAtom, get(fitViewBoxOptionsAtom).linked ? { top: v, right: v, bottom: v, left: v } : { [side]: v });
    }
);

export const applyFitViewBoxAtom = atom(
    null,
    (get, set) => {
        const mode = get(fitViewBoxDialogAtom);
        const o = get(fitViewBoxOptionsAtom);
        const padding: Padding = { top: o.top, right: o.right, bottom: o.bottom, left: o.left };
        const selection = get(selectionAtom);

        let ok = false;
        if (mode === 'selection-into-viewbox') {
            ok = fitNodesToViewBox(selection, { padding, keepAspect: o.keepAspect, center: o.center });
        } else if (mode === 'viewbox-to-selection') {
            ok = fitViewBoxToNodes(selection, padding);
        } else if (mode === 'viewbox-to-content') {
            ok = fitViewBoxToNodes(topLevelIds(), padding);
        }

        set(fitViewBoxDialogAtom, null);
        if (!ok) {
            toast.error(mode === 'selection-into-viewbox' ? 'Nothing to fit, or the document has no viewBox' : 'Nothing to fit');
        } else if (mode !== 'selection-into-viewbox') {
            set(zoomToFitAtom);
        }
    }
);
