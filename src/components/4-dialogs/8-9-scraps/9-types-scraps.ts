import { type Setter, atom } from "jotai";
import { snapshot } from "valtio";
import { toast } from "sonner";

import { type SvgDoc, type ViewBox, type Attrs, parseSvg, topmostIds } from "@/svg-core";
import { STORAGE_KEYS, atomWithDialogOptions } from "@/store/2-persist";
import { buildSvgExportText, commitHistory, docState, topLevelIds } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { insertMarkupAtTop } from "@/store/6-layers";

//---------------------------------------------------------------------------

export const isOpenScrapsDialogAtom = atom(false);

//---------------------------------------------------------------------------

/** Named set of elements saved from the canvas */
export type Scrap = {
    name: string;
    svg: string;                 // the elements in an <svg> with the viewBox fitted around them; shown as the preview and inserted on load
    viewBox: ViewBox | null;     // document viewBox at save time; restored when the scrap replaces the canvas
    rootAttrs: Attrs;            // document root <svg> attributes at save time; restored when the scrap replaces the canvas
    count: number;               // number of top-level elements
    updatedAt: number;
};

const scrapsBaseAtom = atom<Scrap[]>(loadScraps());

/** Saved scraps, newest first */
export const scrapsAtom = atom(
    (get) => [...get(scrapsBaseAtom)].sort((a, b) => b.updatedAt - a.updatedAt)
);

function loadScraps(): Scrap[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.scraps);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed.filter(isScrap) : [];
    } catch (e) {
        console.error("Failed to load scraps", e);
        return [];
    }
}

function isScrap(v: unknown): v is Scrap {
    const s = v as Scrap;
    return !!s && typeof s === 'object' && typeof s.name === 'string' && typeof s.svg === 'string' && typeof s.updatedAt === 'number';
}

/** Stores the list first so a full localStorage leaves the in-memory list unchanged */
function writeScraps(set: Setter, next: Scrap[]): boolean {
    try {
        localStorage.setItem(STORAGE_KEYS.scraps, JSON.stringify(next));
    } catch (e) {
        toast.error(`Failed to save scraps: ${String(e)}`);
        return false;
    }
    set(scrapsBaseAtom, next);
    return true;
}

//---------------------------------------------------------------------------

/** Which elements Save takes */
export type ScrapSaveScope = 'selection' | 'all';

/** How Load brings a scrap back */
export type ScrapLoadMode = 'add' | 'replace';

export type ScrapsDialogOptions = {
    saveScope: ScrapSaveScope;
    loadMode: ScrapLoadMode;
};

export const scrapsOptionsAtom = atomWithDialogOptions<ScrapsDialogOptions>('scraps', {
    saveScope: 'selection',
    loadMode: 'add',
});

//---------------------------------------------------------------------------

/** Saves the selected (or all top-level) elements under `name`, replacing a scrap with the same name */
export const doSaveScrapAtom = atom(
    null,
    (get, set, { name, scope }: { name: string; scope: ScrapSaveScope; }): boolean => {
        const ids = scope === 'selection' ? get(selectionAtom) : topLevelIds();
        const rv = buildSvgExportText(ids, { useViewBox: false });
        if (!ids.length || !rv.ok) {
            toast.error('Nothing to save');
            return false;
        }

        const doc = snapshot(docState).doc as SvgDoc;
        const scrap: Scrap = {
            name,
            svg: rv.text,
            viewBox: doc.viewBox && { ...doc.viewBox },
            rootAttrs: { ...doc.rootAttrs },
            count: topmostIds(doc, ids).length,
            updatedAt: Date.now(),
        };
        return writeScraps(set, [...get(scrapsBaseAtom).filter((s) => s.name !== name), scrap]);
    }
);

/** Adds the scrap's elements on top of the canvas, or replaces the canvas with them and the saved viewBox */
export const doLoadScrapAtom = atom(
    null,
    (get, set, { name, mode }: { name: string; mode: ScrapLoadMode; }): boolean => {
        const scrap = get(scrapsBaseAtom).find((s) => s.name === name);
        if (!scrap) {
            return false;
        }

        if (mode === 'add') {
            const ids = insertMarkupAtTop(get, scrap.svg);
            if (!ids) {
                toast.error(`Scrap "${name}" has no elements`);
                return false;
            }
            set(setSelectionAtom, ids);
            return true;
        }

        const parsed = parseSvg(scrap.svg);
        if (!parsed.ok) {
            toast.error(parsed.error);
            return false;
        }
        docState.doc = { viewBox: scrap.viewBox, rootAttrs: scrap.rootAttrs, children: parsed.doc.children };
        commitHistory({ origin: 'load' });
        set(setSelectionAtom, []);
        return true; // the caller zooms to fit after closing the dialog
    }
);

export const doDeleteScrapAtom = atom(
    null,
    (get, set, name: string) => {
        writeScraps(set, get(scrapsBaseAtom).filter((s) => s.name !== name));
    }
);
