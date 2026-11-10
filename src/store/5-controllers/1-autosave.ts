import { STORAGE_KEYS } from "../2-persist";
import { SAMPLE_SVG, docToText, loadSvgText, markSaved } from "../3-document";

/** Loads the last saved document from local storage (or the sample) at startup. Saving is manual, see `saveDocToStorage`. */
export function installAutosave(): void {
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(STORAGE_KEYS.doc);
    } catch {
        // storage unavailable
    }
    if (!saved || !loadSvgText(saved, { resetUndo: true }).ok) {
        loadSvgText(SAMPLE_SVG, { resetUndo: true });
    }
}

/** Writes the current document to local storage; clears the unsaved-changes indicator on success */
export function saveDocToStorage(): boolean {
    try {
        localStorage.setItem(STORAGE_KEYS.doc, docToText());
        markSaved('storage');
        return true;
    } catch (e) {
        console.error('Failed to save the document to local storage', e);
        return false;
    }
}
