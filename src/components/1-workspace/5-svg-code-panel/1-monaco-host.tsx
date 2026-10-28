import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings, MONACO_DEFAULT_FONT_FAMILY } from "@/store/1-ui-settings";

import { docToText } from "@/store/3-document";
import { isThemeDark } from "@/utils/theme-utils";

import { monacoMountedAtom } from "./9-atoms-monaco-host";
import Editor from "@monaco-editor/react";
import "./2-monaco-setup";

/** Lazy-loaded: pulls the whole Monaco bundle only when the panel opens */
export default function MonacoHost() {
    const { theme, monaco } = useSnapshot(appSettings);
    const onMount = useSetAtom(monacoMountedAtom);

    return (
        <Editor
            defaultLanguage="xml"
            defaultValue={docToText()}
            theme={isThemeDark(theme) ? 'vs-dark' : 'vs'}
            options={{
                ...EDITOR_OPTIONS,
                fontFamily: monaco.fontFamily.trim() || MONACO_DEFAULT_FONT_FAMILY,
                fontSize: monaco.fontSize,
                minimap: { enabled: monaco.minimap },
            }}
            onMount={(editor, monaco) => onMount({ editor, monaco })}
            loading={<div className="p-3 text-muted-foreground">Loading editor...</div>}
        />
    );
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
