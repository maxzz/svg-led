import { subscribe } from "valtio";

import { STORAGE_KEYS } from "../2-persist";
import { SAMPLE_SVG, docToText, equivalentDocText, historyState, loadSvgText } from "../3-document";
import { appStore } from "../0-app-store";
import { codeTextAtom } from "../4-editor";

/** Loads the last document (or the sample) and saves the source after every history change */
export function installAutosave(): () => void {
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(STORAGE_KEYS.doc);
    } catch {
        // storage unavailable
    }
    if (saved && loadSvgText(saved, { resetUndo: true }).ok) {
        // the editor starts from the saved text, so a formatted file keeps its layout
        appStore.set(codeTextAtom, saved);
    } else {
        loadSvgText(SAMPLE_SVG, { resetUndo: true });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe(
        historyState,
        () => {
            clearTimeout(timer);
            timer = setTimeout(save, SAVE_DELAY_MS);
        }
    );

    window.addEventListener('beforeunload', save);

    return () => {
        unsubscribe();
        clearTimeout(timer);
        window.removeEventListener('beforeunload', save);
    };
}

const SAVE_DELAY_MS = 600;

/**
 * Saves the editor's text when it describes the current document (so a formatted file stays formatted),
 * otherwise the canonical serialization. The editor text may be stale, but the equivalence check makes that harmless.
 */
function save() {
    try {
        const canonical = docToText();
        const code = appStore.get(codeTextAtom);
        localStorage.setItem(STORAGE_KEYS.doc, code && equivalentDocText(code, canonical) ? code : canonical);
    } catch (e) {
        console.error('Failed to autosave the document', e);
    }
}
