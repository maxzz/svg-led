import { atom } from "jotai";
import { snapshot } from "valtio";
import { type SvgDoc, unionRects } from "@/svg-core";
import { docState, nodesDocBBox } from "../3-document";
import { selectionAtom } from "./2-selection-atoms";
import { canvasSizeAtom, fitRectViewport, viewportAtom, zoomAtAtom, zoomToRectAtom } from "./3-viewport-atoms";

/** Shows the viewBox and all content; `leftInset` (canvas px) keeps that much of the left edge free, e.g. for the Properties panel */
export const zoomToFitAtom = atom(
    null,
    (get, set, opts?: { leftInset?: number; }) => {
        const doc = snapshot(docState).doc as SvgDoc;
        const content = nodesDocBBox(doc, doc.children.map((n) => n.id));
        const rect = unionRects([doc.viewBox, content]) ?? { x: 0, y: 0, width: 512, height: 512 };
        const vp = fitRectViewport(get(canvasSizeAtom), rect, opts?.leftInset);
        vp && set(viewportAtom, vp);
    }
);

export const zoomToSelectionAtom = atom(
    null,
    (get, set) => {
        const ids = get(selectionAtom);
        if (!ids.length) {
            set(zoomToFitAtom);
            return;
        }
        set(zoomToRectAtom, nodesDocBBox(snapshot(docState).doc as SvgDoc, ids));
    }
);

export const zoomResetAtom = atom(
    null,
    (_get, set) => set(zoomAtAtom, { zoom: 1 })
);
