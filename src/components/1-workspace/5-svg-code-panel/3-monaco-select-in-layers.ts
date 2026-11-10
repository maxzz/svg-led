import type * as Monaco from "monaco-editor";
import { appStore } from "@/store/0-app-store";
import { sourceMapAtom } from "@/store/4-editor";
import { nodeAtOffset } from "@/svg-core";
import { selectInLayersAtom } from "../6-layers-panel/a-layer-atoms/9-atoms-layers-panel";

/** Context key: true while the caret is on an element, so the command is only offered there */
const ELEMENT_AT_CARET = 'svgLed.elementAtCaret';

/**
 * "Select in layers" in the editor's context menu (and the command palette) while the caret is on an element.
 * The element is found through the source map, the same way the caret selects it on the canvas.
 */
export function addSelectInLayersAction(editor: Monaco.editor.IStandaloneCodeEditor) {
    const hasElement = editor.createContextKey<boolean>(ELEMENT_AT_CARET, false);

    const elementAtCaret = (): string | undefined => {
        const model = editor.getModel();
        const position = editor.getPosition();
        return model && position ? nodeAtOffset(appStore.get(sourceMapAtom), model.getOffsetAt(position)) : undefined;
    };
    const update = () => hasElement.set(elementAtCaret() !== undefined);

    update();
    const unsubMap = appStore.sub(sourceMapAtom, update);
    const cursorSub = editor.onDidChangeCursorPosition(update);
    editor.onDidDispose(() => {
        unsubMap();
        cursorSub.dispose();
    });

    editor.addAction({
        id: 'svg-led.selectInLayers',
        label: 'Select in layers',
        contextMenuGroupId: 'navigation',
        precondition: ELEMENT_AT_CARET,
        run: () => {
            const id = elementAtCaret();
            id && appStore.set(selectInLayersAtom, id);
        },
    });
}
