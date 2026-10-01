import { atom } from "jotai";
import type * as Monaco from "monaco-editor";
import { type SourceMap } from "@/svg-core";

export type MonacoHandle = {
    editor: Monaco.editor.IStandaloneCodeEditor;
    monaco: typeof Monaco;
};

/** Set by the Monaco host from the editor's onMount; the code-sync controller attaches to it */
export const monacoHandleAtom = atom<MonacoHandle | null>(null);

/** Text last written by the canvas into the editor (used when the panel mounts) */
export const codeTextAtom = atom('');

/** Element ranges of the text that is currently in the editor */
export const sourceMapAtom = atom<SourceMap>(new Map());

/** Parse error of the editor text, shown above the editor */
export const codeErrorAtom = atom<string | null>(null);

/** The editor text differs from the canvas while sync is off */
export const codeDirtyAtom = atom(false);
