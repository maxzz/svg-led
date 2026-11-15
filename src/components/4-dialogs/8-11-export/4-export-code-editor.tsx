import { useSnapshot } from "valtio";
import Editor from "@monaco-editor/react";
import { appSettings, MONACO_DEFAULT_FONT_FAMILY } from "@/store/1-ui-settings";
import { isThemeDark } from "@/utils/theme-utils";
import { type ExportTextLanguage } from "@/transforms/2-export";
import "@/components/1-workspace/5-svg-code-panel/2-monaco-setup";

/** Read-only view of the exported text. Kept off the canvas editor, so it does not retarget code sync. */
export default function ExportCodeEditor({ text, language }: { text: string; language: ExportTextLanguage; }) {
    const { theme, monaco } = useSnapshot(appSettings);

    return (
        <Editor
            language={language}
            value={text}
            theme={isThemeDark(theme) ? "vs-dark" : "vs"}
            options={{
                readOnly: true,
                domReadOnly: true,
                fontFamily: monaco.fontFamily.trim() || MONACO_DEFAULT_FONT_FAMILY,
                fontSize: monaco.fontSize,
                minimap: { enabled: false },
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                wrappingIndent: "indent",
                tabSize: 4,
                automaticLayout: true,
                renderLineHighlight: "none",
                renderValidationDecorations: "off",
                folding: true,
                stickyScroll: { enabled: false },
                glyphMargin: false,
                contextmenu: true,
                padding: { top: 8, bottom: 8 },
            }}
            loading={<div className="p-3 text-xs text-muted-foreground">Loading preview...</div>}
        />
    );
}
