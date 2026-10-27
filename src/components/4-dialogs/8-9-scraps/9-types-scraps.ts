import { type Setter, atom } from "jotai";
import { snapshot } from "valtio";
import { toast } from "sonner";
import { type Attrs, type SvgDoc, type SvgNode, type ViewBox, newNodeId, parseSvg, parseSvgFragment, topmostIds } from "@/svg-core";
import { STORAGE_KEYS, atomWithDialogOptions } from "@/store/2-persist";
import { buildSvgExportText, commitHistory, docState, topLevelIds } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";

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
export const scrapsAtom = atom((get) => [...get(scrapsBaseAtom)].sort((a, b) => b.updatedAt - a.updatedAt));

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
            const parsed = parseSvg(scrap.svg);
            const nodes = parsed.ok ? parsed.doc.children.flatMap(unwrapNestedSvg) : [];
            if (!nodes.length) {
                toast.error(`Scrap "${name}" has no elements`);
                return false;
            }
            docState.doc.children.push(...nodes);
            commitHistory();
            set(setSelectionAtom, nodes.map((n) => n.id));
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

/**
 * Returns the contents of a nested <svg> element as top-level nodes, without the <svg> itself.
 * Its x/y and viewBox-to-size scale become a transform on a group, and only when they are not the identity.
 */
function unwrapNestedSvg(node: SvgNode): SvgNode[] {
    if (node.kind !== 'passthrough' || node.tag.toLowerCase() !== 'svg') {
        return [node];
    }

    const children = (parseSvgFragment(node.inner) ?? []).flatMap(unwrapNestedSvg);
    const transform = nestedSvgTransform(node.attrs);
    if (!transform) {
        return children;
    }
    return [{ id: newNodeId(), kind: 'g', children, attrs: { transform } }];
}

/** `translate(...) scale(...)` for a nested <svg>'s viewport, or undefined when it maps coordinates unchanged */
function nestedSvgTransform(attrs: Attrs): string | undefined {
    const num = (v: string | undefined, fallback: number) => (v === undefined || v.trim() === '' || !Number.isFinite(parseFloat(v)) ? fallback : parseFloat(v));
    const x = num(attrs.x, 0);
    const y = num(attrs.y, 0);
    const vb = (attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
    const [vbX, vbY, vbW, vbH] = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0 ? vb : [0, 0, 0, 0];

    const width = num(attrs.width, vbW);
    const height = num(attrs.height, vbH);
    const sx = vbW ? width / vbW : 1;
    const sy = vbH ? height / vbH : 1;
    const tx = x - vbX * sx;
    const ty = y - vbY * sy;

    if (tx === 0 && ty === 0 && sx === 1 && sy === 1) {
        return undefined;
    }
    return `translate(${tx} ${ty}) scale(${sx} ${sy})`;
}

export const doDeleteScrapAtom = atom(
    null,
    (get, set, name: string) => {
        writeScraps(set, get(scrapsBaseAtom).filter((s) => s.name !== name));
    }
);
