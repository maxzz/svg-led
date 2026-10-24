import { snapshot } from "valtio";
import { type SvgDoc, findNode, serializeSvg, topmostIds } from "@/svg-core";
import { appSettings } from "../1-ui-settings";
import { docPrecision, docState } from "./1-doc-store";
import { docToText, loadSvgText } from "./4-doc-actions";
import { nodesDocBBox } from "./3-doc-geometry";

type FilePickerWindow = Window & {
    showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
};

const SVG_TYPES = [{ description: 'SVG image', accept: { 'image/svg+xml': ['.svg'] } }];

let currentHandle: FileSystemFileHandle | null = null;

export type FileResult = { ok: true; } | { ok: false; error: string; } | { ok: false; cancelled: true; };

//---------------------------------------------------------------------------

export async function openSvgFile(): Promise<FileResult> {
    const w = window as FilePickerWindow;
    try {
        if (w.showOpenFilePicker) {
            const [handle] = await w.showOpenFilePicker({ types: SVG_TYPES, multiple: false });
            const file = await handle.getFile();
            const rv = await loadSvgFile(file);
            if (rv.ok) {
                currentHandle = handle;
            }
            return rv;
        }
        const file = await pickFileWithInput('.svg,image/svg+xml');
        return file ? loadSvgFile(file) : { ok: false, cancelled: true };
    } catch (e) {
        return isAbort(e) ? { ok: false, cancelled: true } : { ok: false, error: String(e) };
    }
}

export async function loadSvgFile(file: File): Promise<FileResult> {
    const text = await file.text();
    currentHandle = null;
    return loadSvgText(text, { fileName: file.name, resetUndo: false });
}

//---------------------------------------------------------------------------

export async function saveSvgFile(): Promise<FileResult> {
    const text = docToText();
    const w = window as FilePickerWindow;
    try {
        if (w.showSaveFilePicker) {
            const handle = currentHandle ?? await w.showSaveFilePicker({ suggestedName: docState.fileName, types: SVG_TYPES });
            const writable = await handle.createWritable();
            await writable.write(text);
            await writable.close();
            currentHandle = handle;
            docState.fileName = handle.name;
            return { ok: true };
        }
        downloadBlob(new Blob([text], { type: 'image/svg+xml' }), docState.fileName);
        return { ok: true };
    } catch (e) {
        return isAbort(e) ? { ok: false, cancelled: true } : { ok: false, error: String(e) };
    }
}

export function saveSvgFileAs(): Promise<FileResult> {
    currentHandle = null;
    return saveSvgFile();
}

//---------------------------------------------------------------------------

export function exportSvgDownload(): void {
    downloadBlob(new Blob([docToText()], { type: 'image/svg+xml' }), docState.fileName);
}

/** Rasterizes the document at its viewBox size (or content bbox) times `scale` */
export async function exportPng(scale: number, background?: string): Promise<FileResult> {
    const blob = await rasterizeDocument(snapshot(docState).doc as SvgDoc, scale, background);
    if (!blob.ok) {
        return blob;
    }
    downloadBlob(blob.blob, docState.fileName.replace(/\.svg$/i, '') + (scale !== 1 ? `@${scale}x` : '') + '.png');
    return { ok: true };
}

/** Puts a PNG on the clipboard: the nodes `ids`, or the whole drawing when `ids` is empty */
export async function copyPngToClipboard(ids: readonly string[] = []): Promise<FileResult> {
    const target = documentToCopy(ids);
    if (!target.ok) {
        return target;
    }

    const rv = await rasterizeDocument(target.doc, 2);
    if (!rv.ok) {
        return rv;
    }
    try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': rv.blob })]);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}

/** Puts SVG markup on the clipboard: the nodes `ids`, or the whole drawing when `ids` is empty */
export async function copySvgToClipboard(ids: readonly string[] = []): Promise<FileResult> {
    const target = documentToCopy(ids);
    if (!target.ok) {
        return target;
    }

    try {
        await navigator.clipboard.writeText(serializeSvg(target.doc, { precision: docPrecision() }));
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}

/**
 * The document to copy: the whole drawing when `ids` is empty, otherwise a document holding the top-most nodes of `ids`
 * with a padded viewBox (and matching size) around them
 */
function documentToCopy(ids: readonly string[]): { ok: true; doc: SvgDoc; } | { ok: false; error: string; } {
    const doc = snapshot(docState).doc as SvgDoc;
    if (!ids.length) {
        return { ok: true, doc };
    }

    const bbox = nodesDocBBox(doc, ids);
    if (!bbox) {
        return { ok: false, error: 'Nothing to copy' };
    }

    const pad = 4;
    const box = { x: bbox.x - pad, y: bbox.y - pad, width: bbox.width + 2 * pad, height: bbox.height + 2 * pad };
    return {
        ok: true,
        doc: {
            ...doc,
            viewBox: box,
            rootAttrs: { ...doc.rootAttrs, width: String(box.width), height: String(box.height) },
            children: topmostIds(doc, ids).map((id) => findNode(doc, id)!.node),
        },
    };
}

type RasterResult = { ok: true; blob: Blob; } | { ok: false; error: string; };

/** Renders the document's viewBox (or content bbox) to a PNG blob at `scale` */
async function rasterizeDocument(doc: SvgDoc, scale: number, background?: string): Promise<RasterResult> {
    const box = doc.viewBox ?? nodesDocBBox(doc, doc.children.map((n) => n.id));
    if (!box) {
        return { ok: false, error: 'Nothing to export' };
    }

    const width = Math.max(1, Math.round(box.width * scale));
    const height = Math.max(1, Math.round(box.height * scale));
    const text = serializeSvg(
        {
            ...doc,
            viewBox: box,
            rootAttrs: { ...doc.rootAttrs, width: String(width), height: String(height) },
        },
        { precision: docPrecision() }
    );

    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        if (background) {
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        return blob ? { ok: true, blob } : { ok: false, error: 'PNG encoding failed' };
    } catch (e) {
        return { ok: false, error: String(e) };
    } finally {
        URL.revokeObjectURL(url);
    }
}

//---------------------------------------------------------------------------

export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickFileWithInput(accept: string): Promise<File | null> {
    return new Promise(
        (resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.onchange = () => resolve(input.files?.[0] ?? null);
            input.oncancel = () => resolve(null);
            input.click();
        }
    );
}

function isAbort(e: unknown): boolean {
    return e instanceof DOMException && e.name === 'AbortError';
}
