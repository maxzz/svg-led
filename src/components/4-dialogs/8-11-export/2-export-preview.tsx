import { type CSSProperties, lazy, Suspense } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/ui/shadcn/slider";

import { type ExportFrame, EXPORT_PREVIEW_ZOOM_MAX, EXPORT_PREVIEW_ZOOM_MIN, exportFrameAtom, exportPreviewImageAtom, exportPreviewZoomAtom, exportResultAtom } from "./9-atoms-export";

const ExportCodeEditor = lazy(() => import("./4-export-code-editor"));

/** Bottom of the left column: the exported drawing as an image, with its zoom, file name and size */
export function ExportImagePreview() {
    const result = useAtomValue(exportResultAtom);
    const image = useAtomValue(exportPreviewImageAtom);
    const frame = useAtomValue(exportFrameAtom);
    const zoom = useAtomValue(exportPreviewZoomAtom);
    const setZoom = useSetAtom(exportPreviewZoomAtom);
    const output = result?.ok ? result.output : undefined;

    return (
        <div className="min-w-0 min-h-0 flex flex-1 flex-col border-t">
            <div className="relative flex flex-1 min-h-0 p-6 bg-muted/40 overflow-auto" style={FRAME_AREA}>
                {image && frame && <ExportFrameView frame={frame} image={image} zoom={zoom} />}
            </div>

            <div className="shrink-0 px-3 py-1 border-t flex items-center gap-2 text-muted-foreground">
                <ZoomOut className="size-3 shrink-0" aria-label="Zoom out" />
                <Slider className="w-32" min={EXPORT_PREVIEW_ZOOM_MIN} max={EXPORT_PREVIEW_ZOOM_MAX} step={1} value={[zoom]} onValueChange={(v) => setZoom(v[0])} aria-label="Preview zoom" />
                <ZoomIn className="size-3 shrink-0" aria-label="Zoom in" />
            </div>

            <div className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground border-t flex items-center gap-2">
                {!result && <span>Rendering...</span>}
                {result && !result.ok && <span className="text-destructive">{result.error}</span>}
                {output && <>
                    <span className="font-medium text-foreground truncate">{output.fileName}</span>
                    {output.kind === 'image' && <span className="tabular-nums">{output.width} × {output.height} px</span>}
                    <span className="ml-auto tabular-nums">{formatSize(output.kind === 'image' ? output.blob.size : new Blob([output.text]).size)}</span>
                </>}
            </div>
        </div>
    );
}

/** Right column, below the options: the exported text. Bitmap output has no text to show. */
export function ExportCodeView() {
    const result = useAtomValue(exportResultAtom);
    const output = result?.ok ? result.output : undefined;

    if (output?.kind === 'image') {
        return (
            <div className="min-h-0 flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">
                Bitmap image: the preview is at the left.
            </div>
        );
    }

    if (output?.kind === 'text') {
        return (
            <div className="min-h-0 flex-1">
                <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Loading preview...</div>}>
                    <ExportCodeEditor text={output.text} language={output.language} />
                </Suspense>
            </div>
        );
    }

    return <div className="min-h-0 flex-1" />;
}

/**
 * The export's frame at its true aspect ratio, as large as the preview area allows. The image fills the frame exactly,
 * so the drawing sits where the export puts it: the viewBox is the frame, and the content is positioned inside it.
 */
function ExportFrameView({ frame, image, zoom }: { frame: ExportFrame; image: string; zoom: number; }) {
    return (
        <div className="relative m-auto shadow-md border border-foreground/20 border-dotted" style={frameStyle(frame, zoom)}>
            <span className="absolute bottom-full left-0 mb-1 text-[10px] leading-none tabular-nums whitespace-nowrap text-muted-foreground">
                {frame.label}
            </span>
            <img className="absolute inset-0 size-full" src={image} alt="Export preview" draggable={false} />
        </div>
    );
}

/**
 * Width is the largest that keeps the aspect ratio inside the container, which is sized with container query units.
 * A bitmap is never wider than its pixel width, so it is not scaled up (that would blur it). The zoom is applied on top
 * of that; when zoomed past the area, the area scrolls.
 */
function frameStyle({ width, height, oneToOne }: ExportFrame, zoom: number): CSSProperties {
    const ratio = width / height;
    const fit = `min(100cqw, calc(100cqh * ${ratio}))`;
    const base = oneToOne ? `min(${width}px, ${fit})` : fit;
    return {
        width: zoom === 100 ? base : `calc(${base} * ${zoom / 100})`,
        aspectRatio: `${width} / ${height}`,
        ...CHECKERBOARD,
    };
}

function formatSize(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

/** The area around the frame is a container for it (size containment), so the frame can be sized from it */
const FRAME_AREA: CSSProperties = {
    containerType: 'size',
};

const CHECKERBOARD: CSSProperties = {
    backgroundImage: 'conic-gradient(rgb(128 128 128 / 0.12) 25%, transparent 0 50%, rgb(128 128 128 / 0.12) 0 75%, transparent 0)',
    backgroundSize: '16px 16px',
};
