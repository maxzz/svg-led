import { type CSSProperties, lazy, Suspense } from "react";
import { useAtomValue } from "jotai";

import { type ExportFrame, exportFrameAtom, exportPreviewImageAtom, exportResultAtom } from "./9-atoms-export";

const ExportCodeEditor = lazy(() => import("./4-export-code-editor"));

/** Bottom of the left column: the exported drawing as an image, with its file name and size */
export function ExportImagePreview() {
    const result = useAtomValue(exportResultAtom);
    const image = useAtomValue(exportPreviewImageAtom);
    const frame = useAtomValue(exportFrameAtom);
    const output = result?.ok ? result.output : undefined;

    return (
        <div className="min-w-0 min-h-0 flex flex-1 flex-col border-t">
            <div className="relative flex flex-1 min-h-0 items-center justify-center p-6 bg-muted/40" style={FRAME_AREA}>
                {image && frame && <ExportFrameView frame={frame} image={image} />}
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
function ExportFrameView({ frame, image }: { frame: ExportFrame; image: string; }) {
    return (
        <div className="relative shadow-md border border-foreground/20 border-dotted" style={frameStyle(frame)}>
            <span className="absolute bottom-full left-0 mb-1 text-[10px] leading-none tabular-nums whitespace-nowrap text-muted-foreground">
                {frame.label}
            </span>
            <img className="absolute inset-0 size-full" src={image} alt="Export preview" draggable={false} />
        </div>
    );
}

/**
 * Width is the largest that keeps the aspect ratio inside the container, which is sized with container query units.
 * A bitmap is never wider than its pixel width, so it is not scaled up (that would blur it).
 */
function frameStyle({ width, height, oneToOne }: ExportFrame): CSSProperties {
    const ratio = width / height;
    const fit = `min(100cqw, calc(100cqh * ${ratio}))`;
    return {
        width: oneToOne ? `min(${width}px, ${fit})` : fit,
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
