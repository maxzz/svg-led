import { atom } from "jotai";
import { toast } from "sonner";
import { docState, loadSvgText, topLevelIds } from "@/store/3-document";
import { setSelectionAtom, zoomToFitAtom } from "@/store/4-editor";
import { insertMarkupAtTop } from "@/store/6-layers";
import { type PasteContext } from "./9-paste-types";
import { runPastePipeline } from "./0-paste-pipeline";

/**
 * Pasted or dropped text through the paste blocks, then into the document: inserted on top of the current scope,
 * or, on an empty canvas, loaded as the document. Selects the new elements and returns their ids; undefined when the text is not SVG.
 */
export const doPasteMarkupAtom = atom(
    null,
    (get, set, text: string): string[] | undefined => {
        const doc = docState.doc;
        const ctx: PasteContext = {
            docIsEmpty: !doc.children.length,
            viewBox: doc.viewBox && { ...doc.viewBox },
            rootAttrs: { ...doc.rootAttrs },
        };
        const rv = runPastePipeline(text, ctx);

        let ids: string[] | undefined;
        if (rv.asDocument) {
            const before = viewBoxKey(ctx.viewBox);
            if (!loadSvgText(rv.text).ok) {
                return undefined;
            }
            ids = topLevelIds();
            viewBoxKey(docState.doc.viewBox) !== before && set(zoomToFitAtom);
        } else {
            ids = insertMarkupAtTop(get, rv.text);
        }
        if (!ids?.length) {
            return undefined;
        }

        set(setSelectionAtom, ids);

        for (const block of rv.applied) {
            block.notice && toast.info(block.notice);
        }
        
        return ids;
    }
);

function viewBoxKey(vb: PasteContext['viewBox']): string {
    return vb ? `${vb.x} ${vb.y} ${vb.width} ${vb.height}` : '';
}
