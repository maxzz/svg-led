import { subscribe } from "valtio";

import { STORAGE_KEYS } from "../2-persist";
import { SAMPLE_SVG, historyState, loadSvgText } from "../3-document";
import { jotaiStore } from "../8-jotai-store";
import { codeTextAtom } from "../4-editor";
import { sourceTextForSave } from "./4-monaco-code-sync";

/** Loads the last document (or the sample) and saves the source after every history change */
export function installAutosaveController(): () => void {
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(STORAGE_KEYS.doc);
    } catch {
        // storage unavailable
    }
    if (saved && loadSvgText(saved, { resetUndo: true }).ok) {
        // the editor starts from the saved text, so a formatted file keeps its layout
        jotaiStore.set(codeTextAtom, saved);
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

/** Saves the source as the editor shows it, so a formatted file stays formatted */
function save() {
    try {
        localStorage.setItem(STORAGE_KEYS.doc, sourceTextForSave());
    } catch (e) {
        console.error('Failed to autosave the document', e);
    }
}
