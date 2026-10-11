import { subscribe } from "valtio";
import { STORAGE_KEYS } from "../2-persist";
import { SAMPLE_SVG, docToText, historyState, loadSvgText } from "../3-document";

/** Loads the last document (or the sample) and saves the source after every history change */
export function installAutosave(): () => void {
    let saved: string | null = null;
    try {
        saved = localStorage.getItem(STORAGE_KEYS.doc);
    } catch {
        // storage unavailable
    }
    if (!saved || !loadSvgText(saved, { resetUndo: true }).ok) {
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

function save() {
    try {
        localStorage.setItem(STORAGE_KEYS.doc, docToText());
    } catch (e) {
        console.error('Failed to autosave the document', e);
    }
}
