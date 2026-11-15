import { type CSSProperties, lazy, Suspense } from "react";
import { useAtomValue } from "jotai";
import { fmtNum } from "@/svg-core";
import { svgViewportSize } from "@/transforms/2-export/5-svg-viewport";
import { cn } from "@/utils/classnames";
import { exportPreviewImageAtom, exportResultAtom, exportSourceAtom } from "./9-atoms-export";

const ExportCodeEditor = lazy(() => import("./4-export-code-editor"));

/** Right column: the exported drawing as an image, and the exported text */
export function ExportPreview() {
    const result = useAtomValue(exportResultAtom);
    const image = useAtomValue(exportPreviewImageAtom);
    const source = useAtomValue(exportSourceAtom);
    const output = result?.ok ? result.output : undefined;
    const isImage = output?.kind === 'image';
    const frame = output?.kind === 'image'
        ? { width: output.width, height: output.height }
        : source.ok ? svgViewportSize(source.text) : null;

    return (
        <div className="min-w-0 min-h-0 flex flex-1 flex-col">
            <PreviewFrame image={image} frame={frame} unit={isImage ? 'px' : undefined} tall={isImage} />

            <div className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground border-b flex items-center gap-2">
                {!result && <span>Rendering...</span>}
                {result && !result.ok && <span className="text-destructive">{result.error}</span>}
                {output && <>
                    <span className="font-medium text-foreground truncate">{output.fileName}</span>
                    {output.kind === 'image' && <span className="tabular-nums">{output.width} × {output.height} px</span>}
                    <span className="ml-auto tabular-nums">{formatSize(output.kind === 'image' ? output.blob.size : new Blob([output.text]).size)}</span>
                </>}
            </div>

            {output?.kind === 'text' && (
                <div className="min-h-0 flex-1">
                    <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Loading preview...</div>}>
                        <ExportCodeEditor text={output.text} language={output.language} />
                    </Suspense>
                </div>
            )}
        </div>
    );
}

type FrameSize = { width: number; height: number };

/**
 * The export's own rectangle, fitted into the preview.
 * The drawing is painted into that rectangle, so empty space and preserveAspectRatio alignment stay visible.
 * Numbers on the right and bottom edges are the rectangle's height and width.
 */
function PreviewFrame({ image, frame, unit, tall }: { image: string | null; frame: FrameSize | null; unit?: string; tall: boolean; }) {
    if (!frame) {
        return (
            <div className={cn("relative min-h-0 border-b", tall ? "flex-1" : "shrink-0 h-40")} style={CHECKERBOARD}>
                {image && <img className="absolute inset-0 p-3 size-full object-contain" src={image} alt="Export preview" draggable={false} />}
            </div>
        );
    }

    const widthLabel = dimLabel(frame.width, unit);
    const heightLabel = dimLabel(frame.height, unit);

    return (
        <div className={cn("relative min-h-0 bg-muted/40 border-b", tall ? "flex-1" : "shrink-0 h-40")}>
            <div className="absolute inset-0" style={STAGE}>
                <div className="size-full flex items-center justify-center">
                    <div
                        className="relative"
                        style={{
                            aspectRatio: `${frame.width} / ${frame.height}`,
                            width: `min(100cqw, calc(100cqh * ${frame.width} / ${frame.height}))`,
                        }}
                        title={`${widthLabel} × ${heightLabel}`}
                    >
                        <div className="absolute inset-0 border border-dashed border-(--editor-accent)/70" style={CHECKERBOARD}>
                            {image && <img className="absolute inset-0 size-full object-fill" src={image} alt="Export preview" draggable={false} />}
                        </div>
                        <span className="absolute top-full left-1/2 select-none whitespace-nowrap mt-1 text-[10px] text-muted-foreground tabular-nums -translate-x-1/2">
                            {widthLabel}
                        </span>
                        <span className="absolute left-full top-1/2 select-none whitespace-nowrap ml-1 text-[10px] text-muted-foreground tabular-nums -translate-y-1/2">
                            {heightLabel}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function dimLabel(value: number, unit: string | undefined): string {
    const text = fmtNum(value, 3);
    return unit ? `${text} ${unit}` : text;
}

function formatSize(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

/** Room for the width label under the frame and the height label beside it. The query size is the content box inside this padding. */
const STAGE: CSSProperties = {
    containerType: 'size',
    padding: '0.75rem 3.25rem 1.75rem 0.75rem',
};

const CHECKERBOARD: CSSProperties = {
    backgroundColor: 'var(--background)',
    backgroundImage: 'conic-gradient(rgb(128 128 128 / 0.12) 25%, transparent 0 50%, rgb(128 128 128 / 0.12) 0 75%, transparent 0)',
    backgroundSize: '16px 16px',
};
