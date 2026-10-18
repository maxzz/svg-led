import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import { loader } from "@monaco-editor/react";

/** Bundled Monaco with local workers instead of the CDN copy @monaco-editor/react loads by default */
self.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
};

loader.config({ monaco });

export { monaco };
