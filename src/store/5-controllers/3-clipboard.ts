import { type AppStore } from "../0-app-store";
import { deleteNodes, nodesToText } from "../3-document";
import { selectionAtom, setSelectionAtom } from "../4-editor";
import { insertMarkupAtTop } from "../6-layers";
import { isEditableTarget } from "@/commands";

/** Copy, cut and paste of elements as SVG markup, so they can be pasted into other apps and back */
export function installClipboard(store: AppStore): () => void {

    function onCopy(e: ClipboardEvent, cut: boolean) {
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
    }

    function copy(e: ClipboardEvent) {
        return onCopy(e, false);
    }
    function cut(e: ClipboardEvent) {
        return onCopy(e, true);
    }

    function paste(e: ClipboardEvent) {
        const text = e.clipboardData?.getData('text/plain') ?? '';
        if (isEditableTarget(e.target) || !text.includes('<')) {
            return;
        }
        const ids = insertMarkupAtTop(store.get, text);
        if (ids) {
            e.preventDefault();
            store.set(setSelectionAtom, ids);
        }
    };

    const controller = new AbortController();
    document.addEventListener('copy', copy, { signal: controller.signal });
    document.addEventListener('cut', cut, { signal: controller.signal });
    document.addEventListener('paste', paste, { signal: controller.signal });
    
    return () => {
        controller.abort();
    };
}
