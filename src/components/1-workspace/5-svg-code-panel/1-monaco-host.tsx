import { useState } from "react";
import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import type * as Monaco from "monaco-editor";
import { appSettings, MONACO_DEFAULT_FONT_FAMILY } from "@/store/1-ui-settings";

import { docToText, equivalentDocText } from "@/store/3-document";
import { appStore } from "@/store/0-app-store";
import { codeTextAtom } from "@/store/4-editor";
import { formatSvgText } from "@/svg-core";
import { isThemeDark } from "@/utils/theme-utils";

import { monacoMountedAtom } from "./9-atoms-monaco-host";
import Editor from "@monaco-editor/react";
import "./2-monaco-setup";
import { addSelectInLayersAction } from "./3-monaco-select-in-layers";

/** Lazy-loaded: pulls the whole Monaco bundle only when the panel opens */
export default function MonacoHost() {
    const { theme, monaco } = useSnapshot(appSettings);
    const onMount = useSetAtom(monacoMountedAtom);
    // Read once: the editor only uses the initial value on mount
    const [initialText] = useState(startText);

    return (
        <Editor
            defaultLanguage="xml"
            defaultValue={initialText}
            theme={isThemeDark(theme) ? 'vs-dark' : 'vs'}
            options={{
                ...EDITOR_OPTIONS,
                fontFamily: monaco.fontFamily.trim() || MONACO_DEFAULT_FONT_FAMILY,
                fontSize: monaco.fontSize,
                minimap: { enabled: monaco.minimap },
            }}
            onMount={(editor, monaco) => { hideFindCloseTooltip(editor); addFormatSvgAction(editor, monaco); addSelectInLayersAction(editor); onMount({ editor, monaco }); }}
            loading={<div className="p-3 text-muted-foreground">Loading editor...</div>}
        />
    );
}

/** The last editor text when it still describes the document (keeps a formatted file formatted), otherwise the canonical text */
function startText(): string {
    const doc = docToText();
    const last = appStore.get(codeTextAtom);
    return last && equivalentDocText(last, doc) ? last : doc;
}

const EDITOR_OPTIONS = {
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingIndent: 'indent',
    tabSize: 2,
    automaticLayout: true,
    renderLineHighlight: 'gutter',
    folding: true,
    glyphMargin: false,
    // Monaco pushes the text down while the find widget is open; the widget floats over the first line instead
    find: { addExtraSpaceOnTop: false },
} as const;

/**
 * "Format SVG" in the context menu, the command palette (F1) and on Shift+Alt+F.
 * Formatting is a normal edit, so the code-sync controller parses the result back onto the canvas.
 */
function addFormatSvgAction(editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) {
    editor.addAction({
        id: 'svg-led.formatSvg',
        label: 'Format SVG',
        contextMenuGroupId: '1_modification',
        contextMenuOrder: 1.5,
        keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
        run: (ed) => {
            const m = ed.getModel();
            if (!m) {
                return;
            }
            const old = m.getValue();
            const formatted = formatSvgText(old);
            if (formatted === null) {
                toast.error('Cannot format: the SVG source has syntax errors');
                return;
            }
            if (formatted === old) {
                return;
            }

            // Keep the caret on the same token: count the non-space characters before it and find the same count in the new text
            const before = old.slice(0, m.getOffsetAt(ed.getPosition() ?? { lineNumber: 1, column: 1 }));
            const tokenCount = before.replace(/\s/g, '').length;
            let newOffset = 0;
            for (let seen = 0; newOffset < formatted.length && seen < tokenCount; newOffset++) {
                if (!/\s/.test(formatted[newOffset])) {
                    seen++;
                }
            }

            ed.pushUndoStop();
            ed.executeEdits('svg-led.formatSvg', [{ range: m.getFullModelRange(), text: formatted }]);
            ed.pushUndoStop();
            ed.setPosition(m.getPositionAt(newOffset));
        },
    });
}

/**
 * The find widget's X shows a useless "Close (Escape)" tooltip. Monaco has no option for a single button's tooltip,
 * so the hover events on that button are stopped before Monaco's own listeners see them. The other find buttons keep theirs.
 */
function hideFindCloseTooltip(editor: { getDomNode(): HTMLElement | null; }) {
    const dom = editor.getDomNode();
    if (!dom) {
        return;
    }
    const stop = (e: Event) => {
        if ((e.target as Element).closest?.('.codicon-widget-close')) {
            e.stopImmediatePropagation();
        }
    };
    // Capture phase on the editor, so this runs before the button's own hover listeners
    for (const type of ['mouseover', 'mouseenter', 'pointerover', 'pointerenter', 'focusin']) {
        dom.addEventListener(type, stop, true);
    }
}