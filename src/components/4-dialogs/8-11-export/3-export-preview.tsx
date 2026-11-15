import { type CSSProperties, lazy, Suspense } from "react";
import { useAtomValue } from "jotai";
import { cn } from "@/utils/classnames";
import { exportPreviewImageAtom, exportResultAtom } from "./9-atoms-export";

const ExportCodeEditor = lazy(() => import("./4-export-code-editor"));

/** Right column: the exported drawing as an image, and the exported text */
export function ExportPreview() {
    const result = useAtomValue(exportResultAtom);
    const image = useAtomValue(exportPreviewImageAtom);
    const output = result?.ok ? result.output : undefined;
    const isImage = output?.kind === 'image';

    return (
        <div className="min-w-0 min-h-0 flex flex-1 flex-col">
            <div className={cn("relative", isImage ? "flex-1" : "shrink-0", !isImage && "h-40", "min-h-0 border-b")} style={CHECKERBOARD}>
                {image && <img className={cn("absolute inset-0 p-3 size-full", isImage ? "object-scale-down" : "object-contain")} src={image} alt="Export preview" draggable={false} />}
            </div>

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

function formatSize(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

const CHECKERBOARD: CSSProperties = {
    backgroundImage: 'conic-gradient(rgb(128 128 128 / 0.12) 25%, transparent 0 50%, rgb(128 128 128 / 0.12) 0 75%, transparent 0)',
    backgroundSize: '16px 16px',
};
