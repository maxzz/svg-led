import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import Editor from "@monaco-editor/react";
import { appSettings } from "@/store/1-ui-settings";
import { docToText } from "@/store/3-document";
import { isThemeDark } from "@/utils/theme-utils";
import "./2-monaco-setup";
import { monacoMountedAtom } from "./9-atoms-monaco-host";

const EDITOR_OPTIONS = {
    fontSize: 12,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingIndent: 'indent',
    tabSize: 2,
    automaticLayout: true,
    renderLineHighlight: 'gutter',
    folding: true,
    glyphMargin: false,
} as const;

/** Lazy-loaded: pulls the whole Monaco bundle only when the panel opens */
export default function MonacoHost() {
    const { theme } = useSnapshot(appSettings);
    const onMount = useSetAtom(monacoMountedAtom);

    return (
        <Editor
            defaultLanguage="xml"
            defaultValue={docToText()}
            theme={isThemeDark(theme) ? 'vs-dark' : 'vs'}
            options={EDITOR_OPTIONS}
            onMount={(editor, monaco) => onMount({ editor, monaco })}
            loading={<div className="p-3 text-muted-foreground">Loading editor...</div>}
        />
    );
}
