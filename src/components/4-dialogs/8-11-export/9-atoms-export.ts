import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { toast } from "sonner";

import { atomWithDialogOptions } from "@/store/2-persist";
import { buildSvgExportText, docState, downloadBlob } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { sourceTextForSave } from "@/store/5-controllers";
import { type ExportOptions, type ExportResult, type ExportScope, ExportFormatId, getExportFormat, runExport, svgIntrinsicSize } from "@/transforms/2-export";

export const isOpenExportDialogAtom = atom(false);

/** Selection when the dialog opened. The dialog is modal, so the document stays as it was while it is open. */
const exportTargetIdsAtom = atom<string[]>([]);

/** Bumped on every open, so the export is built from the document as it is now */
const exportOpenCountAtom = atom(0);

export const exportOptionsAtom = atomWithDialogOptions<ExportOptions>('export', {
    format: ExportFormatId.svg,
    scope: 'selection',
    bounds: 'viewBox',
    tailwind: false,
    pngScale: 2,
    pngBackground: '',
    componentName: '',
    dataUriBase64: false,
    dataUriCss: false,
});

export const openExportDialogAtom = atom(
    null,
    (get, set) => {
        set(exportTargetIdsAtom, get(selectionAtom));
        set(exportOpenCountAtom, (n) => n + 1);
        set(isOpenExportDialogAtom, true);
    }
);

//---------------------------------------------------------------------------

export const exportSelectedCountAtom = atom(
    (get) => get(exportTargetIdsAtom).length
);

/** The stored scope, or all elements when nothing was selected */
export const exportScopeAtom = atom<ExportScope>(
    (get) => get(exportOptionsAtom).scope === 'selection' && get(exportTargetIdsAtom).length ? 'selection' : 'all'
);

export const exportFormatAtom = atom(
    (get) => getExportFormat(get(exportOptionsAtom).format)
);

type ExportSource = { ok: true; text: string; } | { ok: false; error: string; };

export function exportBaseName(): string {
    return docState.fileName.replace(/\.svg$/i, '') || 'untitled';
}

//---------------------------------------------------------------------------

/**
 * SVG of the exported elements before the format steps. The whole drawing in the document viewBox is the source as the editor shows it;
 * otherwise the elements are written into an <svg> with that viewBox or one fitted around them.
 */
export const exportSourceAtom = atom(
    (get): ExportSource => {
        get(exportOpenCountAtom);
        const { bounds } = get(exportOptionsAtom);
        const scope = get(exportScopeAtom);
        if (scope === 'all' && bounds === 'viewBox') {
            return { ok: true, text: sourceTextForSave() };
        }
        return buildSvgExportText(scope === 'selection' ? get(exportTargetIdsAtom) : [], { useViewBox: bounds === 'viewBox' });
    }
);

//---------------------------------------------------------------------------

const exportResultAsyncAtom = atom(
    async (get): Promise<ExportResult> => {
        const source = get(exportSourceAtom);
        if (!source.ok) {
            return source;
        }
        return runExport(get(exportFormatAtom), source.text, get(exportOptionsAtom), { baseName: exportBaseName() });
    }
);

/** The latest finished export; the previous one stays while a PNG renders. Null before the first one is ready. */
export const exportResultAtom = unwrap(exportResultAsyncAtom, (prev) => prev ?? null);

//---------------------------------------------------------------------------

/** The size of the exported image, known before rendering: the viewBox, times the PNG scale for PNG */
export type ExportFrame = {
    width: number;
    height: number;
    label: string;
    /** True for a bitmap: it is shown at its pixel size, and only scaled down when the preview area is too small */
    oneToOne: boolean;
};

export const exportFrameAtom = atom(
    (get): ExportFrame | null => {
        const source = get(exportSourceAtom);
        if (!source.ok) {
            return null;
        }
        const size = svgIntrinsicSize(source.text);
        if (!size) {
            return null;
        }
        if (get(exportFormatAtom).id === ExportFormatId.png) {
            const { pngScale } = get(exportOptionsAtom);
            const width = Math.max(1, Math.round(size.width * pngScale));
            const height = Math.max(1, Math.round(size.height * pngScale));
            return { width, height, label: `${width} × ${height} px`, oneToOne: true };
        }
        const width = Math.round(size.width);
        const height = Math.round(size.height);
        return { width: size.width, height: size.height, label: `viewBox ${width} × ${height}`, oneToOne: false };
    }
);

//---------------------------------------------------------------------------

/** Image of the exported drawing: the PNG itself, or the source SVG for the text formats */
export const exportPreviewImageAtom = atom(
    (get): string | null => {
        const result = get(exportResultAtom);
        if (result?.ok && result.output.kind === 'image') {
            return result.output.dataUrl;
        }
        const source = get(exportSourceAtom);
        return source.ok ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.text)}` : null;
    }
);

//---------------------------------------------------------------------------

export const doCopyExportAtom = atom(
    null,
    async (get, set) => {
        const rv = await get(exportResultAsyncAtom);
        if (!rv.ok) {
            toast.error(rv.error);
            return;
        }
        const { output } = rv;
        try {
            if (output.kind === 'image') {
                await navigator.clipboard.write([new ClipboardItem({ [output.mime]: output.blob })]);
            } else {
                await navigator.clipboard.writeText(output.text);
            }
        } catch (e) {
            toast.error(String(e));
            return;
        }
        toast.success(`${get(exportFormatAtom).label} copied to the clipboard`);
        set(isOpenExportDialogAtom, false);
    }
);

//---------------------------------------------------------------------------

export const doDownloadExportAtom = atom(
    null,
    async (get, set) => {
        const rv = await get(exportResultAsyncAtom);
        if (!rv.ok) {
            toast.error(rv.error);
            return;
        }
        const { output } = rv;
        downloadBlob(output.kind === 'image' ? output.blob : new Blob([output.text], { type: output.mime }), output.fileName);
        set(isOpenExportDialogAtom, false);
    }
);
