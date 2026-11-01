import { useSnapshot } from "valtio";
import Editor from "@monaco-editor/react";
import { appSettings, MONACO_DEFAULT_FONT_FAMILY } from "@/store/1-ui-settings";
import { isThemeDark } from "@/utils/theme-utils";
import "@/components/1-workspace/5-svg-code-panel/2-monaco-setup";

/** Read-only XML view of a scrap. Kept off the canvas editor, so opening a preview does not retarget code sync. */
export default function ScrapSourceEditor({ svg }: { svg: string; }) {
    const { theme, monaco } = useSnapshot(appSettings);

    return (
        <Editor
            language="xml"
            value={svg}
            theme={isThemeDark(theme) ? "vs-dark" : "vs"}
            options={{
                readOnly: true,
                domReadOnly: true,
                fontFamily: monaco.fontFamily.trim() || MONACO_DEFAULT_FONT_FAMILY,
                fontSize: monaco.fontSize,
                minimap: { enabled: true },
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                wrappingIndent: "indent",
                tabSize: 2,
                automaticLayout: true,
                renderLineHighlight: "none",
                folding: true,
                stickyScroll: { enabled: false },
                glyphMargin: false,
                contextmenu: true,
                padding: { top: 8, bottom: 8 },
            }}
            loading={<div className="p-3 text-xs text-muted-foreground">Loading source...</div>}
        />
    );
}
