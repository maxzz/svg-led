import { atom } from "jotai";
import type * as Monaco from "monaco-editor";
import { monacoHandleAtom } from "@/store/4-editor";

/** onMount of the editor: hands it to the code-sync controller */
export const monacoMountedAtom = atom(
    null,
    (_get, set, { editor, monaco }: { editor: Monaco.editor.IStandaloneCodeEditor; monaco: typeof Monaco; }) => {
        set(monacoHandleAtom, { editor, monaco });
        editor.onDidDispose(() => set(monacoHandleAtom, null));
    }
);
