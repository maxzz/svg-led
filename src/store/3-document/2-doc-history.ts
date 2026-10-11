import { proxy, snapshot } from "valtio";
import { type SvgDoc } from "@/svg-core";
import { docState } from "./1-doc-store";

/** Where a document change came from; the code-sync controller skips changes that came from the code editor */
export type ChangeOrigin = 'canvas' | 'code' | 'load' | 'history';

//---------------------------------------------------------------------------
// History state

type Entry = {
    doc: SvgDoc;                 // frozen Valtio snapshot (structural sharing keeps it cheap)
    mergeKey?: string;
    time: number;
};

const entries: Entry[] = [];

/** Observable part of the history; `version` changes on every commit, undo, redo and reset */
export const historyState = proxy({
    index: 0,
    length: 0,
    version: 0,
    origin: 'load' as ChangeOrigin,
});

export function resetHistory(origin: ChangeOrigin = 'load'): void {
    entries.length = 0;
    entries.push({ doc: snapshot(docState).doc as SvgDoc, time: Date.now() });
    publish(0, origin);
}

/**
 * Records the current document as a new undo step. Call it once per finished gesture or command.
 * Consecutive commits with the same `mergeKey` inside a short window become one step (slider drags, typing).
 */
export function commitHistory(options: { mergeKey?: string; origin?: ChangeOrigin; } = {}): void {
    const { mergeKey, origin = 'canvas' } = options;
    const now = Date.now();
    const doc = snapshot(docState).doc as SvgDoc;

    entries.length = historyState.index + 1; // drop the redo branch

    const last = entries[entries.length - 1];
    if (mergeKey && last?.mergeKey === mergeKey && now - last.time < MERGE_WINDOW_MS && entries.length > 1) {
        entries[entries.length - 1] = { doc, mergeKey, time: now };
    } else {
        entries.push({ doc, mergeKey, time: now });
        if (entries.length > MAX_ENTRIES) {
            entries.shift();
        }
    }
    publish(entries.length - 1, origin);
}

const MAX_ENTRIES = 200;
const MERGE_WINDOW_MS = 800;

//---------------------------------------------------------------------------

export function undo(): boolean {
    if (historyState.index <= 0) {
        return false;
    }
    restore(historyState.index - 1);
    return true;
}

export function redo(): boolean {
    if (historyState.index >= entries.length - 1) {
        return false;
    }
    restore(historyState.index + 1);
    return true;
}

function restore(index: number): void {
    docState.doc = structuredClone(entries[index].doc);
    entries[index] = { ...entries[index], mergeKey: undefined }; // a new edit after undo never merges into this step
    publish(index, 'history');
}

function publish(index: number, origin: ChangeOrigin): void {
    historyState.index = index;
    historyState.length = entries.length;
    historyState.origin = origin;
    historyState.version++;
}
