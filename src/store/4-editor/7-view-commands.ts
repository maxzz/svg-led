import { atom } from "jotai";
import { snapshot } from "valtio";
import { type SvgDoc, unionRects } from "@/svg-core";
import { docState, nodesDocBBox } from "../3-document";
import { selectionAtom } from "./2-selection-atoms";
import { zoomAtAtom, zoomToRectAtom } from "./3-viewport-atoms";

/** Shows the viewBox and all content */
export const zoomToFitAtom = atom(
    null,
    (_get, set) => {
        const doc = snapshot(docState).doc as SvgDoc;
        const content = nodesDocBBox(doc, doc.children.map((n) => n.id));
        set(zoomToRectAtom, unionRects([doc.viewBox, content]) ?? { x: 0, y: 0, width: 512, height: 512 });
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
