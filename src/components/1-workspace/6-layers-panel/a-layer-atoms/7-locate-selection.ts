import { atom } from "jotai";
import { findNode } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { expandedIdsAtom } from "./2-expanded-groups";

//---------------------------------------------------------------------------
// Locate selection in the tree

/** Opens the groups around the selected elements and scrolls the first one into view (Illustrator's Locate Object) */
export const locateSelectionAtom = atom(
    null,
    (get, set) => {
        const selection = get(selectionAtom);
        const next = new Set(get(expandedIdsAtom));
        for (const id of selection) {
            for (const p of findNode(docState.doc, id)?.parents ?? []) {
                next.add(p.id);
            }
        }
        set(expandedIdsAtom, next);
        appSettings.layersPanel.open = true;

        const first = selection[0];
        first && requestAnimationFrame(
            () => document.querySelector(`[data-layer-id="${CSS.escape(first)}"]`)?.scrollIntoView({ block: 'nearest' })
        );
    }
);
