import { snapshot, subscribe } from "valtio";
import { appSettings } from "../1-ui-settings";
import { type AppStore, appStore } from "../0-app-store";

import { type SvgDoc, buildSourceMap, nodeAtOffset } from "@/svg-core";
import { docState, docToText, historyState, loadSvgText } from "../3-document";

import type * as Monaco from "monaco-editor";
import { type MonacoHandle, codeDirtyAtom, codeErrorAtom, codeTextAtom, monacoHandleAtom, pruneSelectionAtom, selectionAtom, setSelectionAtom, sourceMapAtom } from "../4-editor";

/**
 * Two-way sync between the Monaco editor and the document:
 * canvas commits are written into the editor, editor changes are parsed (debounced) into the document,
 * and the selection is mirrored as highlighted lines. Attaches whenever the editor mounts.
 */
export function installCodeSync(store: AppStore): () => void {
    let detach: (() => void) | undefined;

    const unsubHandle = store.sub(monacoHandleAtom, () => {
        detach?.();
        const handle = store.get(monacoHandleAtom);
        detach = handle ? attach(store, handle) : undefined;
    });

    return () => {
        unsubHandle();
        detach?.();
    };
}

function attach(store: AppStore, { editor, monaco }: MonacoHandle): () => void {
    let writing = false;         // the editor change comes from writeFromDoc, not from typing
    let codeEdited = false;      // the text was typed while sync was off
    let parseTimer: ReturnType<typeof setTimeout> | undefined;
    const decorations = editor.createDecorationsCollection();

    const model = () => editor.getModel();

    function writeFromDoc() {
        const m = model();
        if (!m) {
            return;
        }
        const text = docToText();
        const old = m.getValue();
        if (old !== text) {
            const edits = changedEdits(monaco, m, old, text);
            writing = true;
            editor.pushUndoStop();
            editor.executeEdits(MARKER_OWNER, edits);
            editor.pushUndoStop();
            writing = false;
        }
        codeEdited = false;
        store.set(codeTextAtom, text);
        store.set(codeDirtyAtom, false);
        store.set(codeErrorAtom, null);
        monaco.editor.setModelMarkers(m, MARKER_OWNER, []);
        updateSourceMap(text);
    }

    function updateSourceMap(text: string) {
        store.set(sourceMapAtom, buildSourceMap(text, snapshot(docState).doc as SvgDoc));
        highlightSelection(false);
    }

    function applyFromEditor(): boolean {
        const m = model();
        if (!m) {
            return false;
        }
        const text = m.getValue();
        const rv = loadSvgText(text, { origin: 'code', keepIds: true });
        if (!rv.ok) {
            store.set(codeErrorAtom, rv.error);
            monaco.editor.setModelMarkers(m, MARKER_OWNER, [errorMarker(monaco, m, rv.error)]);
            return false;
        }
        codeEdited = false;
        store.set(codeTextAtom, text);
        store.set(codeErrorAtom, null);
        store.set(codeDirtyAtom, false);
        monaco.editor.setModelMarkers(m, MARKER_OWNER, []);
        store.set(pruneSelectionAtom);
        updateSourceMap(text);
        return true;
    }

    function highlightSelection(reveal: boolean) {
        const map = store.get(sourceMapAtom);
        const ranges = store.get(selectionAtom).map((id) => map.get(id)).filter((r) => !!r);
        decorations.set(ranges.map((r) => ({
            range: new monaco.Range(r.startLine, 1, r.endLine, 1),
            options: { isWholeLine: true, className: 'svgled-code-selected', linesDecorationsClassName: 'svgled-code-selected-gutter' },
        })));
        if (reveal && ranges.length) {
            editor.revealLinesInCenterIfOutsideViewport(ranges[0].startLine, ranges[0].endLine);
        }
    }

    writeFromDoc();

    const unsubHistory = subscribe(historyState, () => {
        if (historyState.origin === 'code') {
            return;
        }
        if (appSettings.codePanel.sync) {
            clearTimeout(parseTimer);
            writeFromDoc();
        } else {
            store.set(codeDirtyAtom, true);
        }
    });

    const unsubSelection = store.sub(selectionAtom, () => highlightSelection(true));

    const contentSub = editor.onDidChangeModelContent(() => {
        if (writing) {
            return;
        }
        if (!appSettings.codePanel.sync) {
            codeEdited = true;
            store.set(codeDirtyAtom, true);
            return;
        }
        clearTimeout(parseTimer);
        parseTimer = setTimeout(applyFromEditor, PARSE_DELAY_MS);
    });

    const cursorSub = editor.onDidChangeCursorPosition((e) => {
        if (writing || e.source === 'api' || e.source === 'modelChange') {
            return;
        }
        const m = model();
        const id = m && nodeAtOffset(store.get(sourceMapAtom), m.getOffsetAt(e.position));
        if (id && !store.get(selectionAtom).includes(id)) {
            store.set(setSelectionAtom, [id]);
        }
    });

    codeSyncCommands = {
        apply: applyFromEditor,
        reload: writeFromDoc,
        resume: () => {
            if (codeEdited) {
                return applyFromEditor();
            }
            writeFromDoc();
            return true;
        },
    };

    return () => {
        clearTimeout(parseTimer);
        unsubHistory();
        unsubSelection();
        contentSub.dispose();
        cursorSub.dispose();
        decorations.clear();
        codeSyncCommands = null;
    };
}

const PARSE_DELAY_MS = 400;
const MARKER_OWNER = 'svg-led';

/**
 * Edits that turn the model text `oldText` into `newText` without replacing unchanged text:
 * Monaco drops the tokens of replaced text until it re-tokenizes, which flashes the highlighting.
 * Same line count (property changes, also for many selected objects): one edit per changed line, covering only its changed characters.
 * Different line count: one edit for the smallest changed character span.
 */
function changedEdits(monaco: typeof Monaco, m: Monaco.editor.ITextModel, oldText: string, newText: string): Monaco.editor.IIdentifiedSingleEditOperation[] {
    const a = oldText.split('\n');
    const b = newText.split('\n');

    if (a.length !== b.length) {
        const [prefix, suffix] = commonEnds(oldText, newText);
        const range = monaco.Range.fromPositions(m.getPositionAt(prefix), m.getPositionAt(oldText.length - suffix));
        return [{ range, text: newText.slice(prefix, newText.length - suffix) }];
    }

    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [];
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            const [prefix, suffix] = commonEnds(a[i], b[i]);
            const line = i + 1;
            edits.push({
                range: new monaco.Range(line, prefix + 1, line, a[i].length - suffix + 1),
                text: b[i].slice(prefix, b[i].length - suffix),
            });
        }
    }
    return edits;
}

/** Lengths of the common prefix and the common suffix of two strings (not overlapping) */
function commonEnds(a: string, b: string): [prefix: number, suffix: number] {
    const max = Math.min(a.length, b.length);
    let prefix = 0;
    while (prefix < max && a[prefix] === b[prefix]) {
        prefix++;
    }
    let suffix = 0;
    while (suffix < max - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) {
        suffix++;
    }
    return [prefix, suffix];
}

function errorMarker(monaco: typeof Monaco, m: Monaco.editor.ITextModel, error: string): Monaco.editor.IMarkerData {
    // DOMParser errors usually contain "line N" and "column M"
    const line = Number(/line\s+(\d+)/i.exec(error)?.[1] ?? 1);
    const column = Number(/column\s+(\d+)/i.exec(error)?.[1] ?? 1);
    const lineNumber = Math.min(Math.max(1, line), m.getLineCount());
    return {
        severity: monaco.MarkerSeverity.Error,
        message: error,
        startLineNumber: lineNumber,
        startColumn: column,
        endLineNumber: lineNumber,
        endColumn: m.getLineMaxColumn(lineNumber),
    };
}

//---------------------------------------------------------------------------

let codeSyncCommands: { apply: () => boolean; reload: () => void; resume: () => boolean; } | null = null;

/** Parses the editor text into the document (used while sync is off and when sync is turned on) */
export function applyCodeToCanvas(): boolean {
    return codeSyncCommands?.apply() ?? false;
}

/** Replaces the editor text with the current document */
export function reloadCodeFromCanvas(): void {
    codeSyncCommands?.reload();
}

/**
 * Turning sync on applies code typed while it was off, otherwise reloads the canvas into the editor;
 * a parse error keeps the code and leaves sync off.
 */
export function setCodeSync(on: boolean): void {
    if (on && appStore.get(codeDirtyAtom) && codeSyncCommands && !codeSyncCommands.resume()) {
        return;
    }
    appSettings.codePanel.sync = on;
}

//---------------------------------------------------------------------------
