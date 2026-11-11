import { atom } from "jotai";
import { type ViewBox } from "@/svg-core";
import { docState, nodesDocBBox, setRootAttr, setViewBox, topLevelIds } from "@/store/3-document";
import { zoomToFitAtom } from "@/store/4-editor";
import { snapshot } from "valtio";

export const isOpenViewBoxSettingsDialogAtom = atom(false);
/** Popover variant opened from the toolbar button */
export const isOpenViewBoxSettingsPopoverAtom = atom(false);

export const VIEWBOX_PRESETS = [16, 24, 32, 48, 64, 100, 128, 256, 512, 1024];

export const setViewBoxAndFitAtom = atom(
    null,
    (_get, set, vb: ViewBox | null) => {
        setViewBox(vb);
        set(zoomToFitAtom);
    }
);

/** Adds a viewBox around the content (or 0 0 24 24 for an empty document) */
export const addViewBoxAtom = atom(
    null,
    (_get, set) => {
        const bbox = nodesDocBBox(snapshot(docState).doc as typeof docState.doc, topLevelIds());
        const vb = bbox
            ? { x: Math.floor(bbox.x), y: Math.floor(bbox.y), width: Math.ceil(bbox.width), height: Math.ceil(bbox.height) }
            : { x: 0, y: 0, width: 24, height: 24 };
        set(setViewBoxAndFitAtom, vb);
    }
);

/** Copies the viewBox size into the width and height attributes of the root element */
export const sizeFromViewBoxAtom = atom(
    null,
    () => {
        const vb = docState.doc.viewBox;
        if (vb) {
            setRootAttr('width', String(vb.width));
            setRootAttr('height', String(vb.height));
        }
    }
);
