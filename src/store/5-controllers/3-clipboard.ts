import { type AppStore } from "../0-app-store";
import { deleteNodes, insertSvgMarkup, nodesToText } from "../3-document";
import { selectionAtom, setSelectionAtom } from "../4-editor";
import { isEditableTarget } from "@/commands";

/** Copy, cut and paste of elements as SVG markup, so they can be pasted into other apps and back */
export function installClipboard(store: AppStore): () => void {
    const onCopy = (e: ClipboardEvent, cut: boolean) => {
        const ids = store.get(selectionAtom);
        if (isEditableTarget(e.target) || !ids.length || !e.clipboardData) {
            return;
        }
        e.preventDefault();
        e.clipboardData.setData('text/plain', nodesToText(ids));
        if (cut) {
            deleteNodes(ids);
            store.set(setSelectionAtom, []);
        }
    };

    const copy = (e: ClipboardEvent) => onCopy(e, false);
    const cut = (e: ClipboardEvent) => onCopy(e, true);

    const paste = (e: ClipboardEvent) => {
        const text = e.clipboardData?.getData('text/plain') ?? '';
        if (isEditableTarget(e.target) || !text.includes('<')) {
            return;
        }
        const ids = insertSvgMarkup(text);
        if (ids) {
            e.preventDefault();
            store.set(setSelectionAtom, ids);
        }
    };

    document.addEventListener('copy', copy);
    document.addEventListener('cut', cut);
    document.addEventListener('paste', paste);
    return () => {
        document.removeEventListener('copy', copy);
        document.removeEventListener('cut', cut);
        document.removeEventListener('paste', paste);
    };
}
