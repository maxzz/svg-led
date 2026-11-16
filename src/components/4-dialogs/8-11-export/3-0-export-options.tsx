import { type ComponentType } from "react";
import { useAtom, useAtomValue } from "jotai";

import { ExportFormatId } from "@/transforms/2-export";
import { Input } from "@/ui/shadcn/input";
import { exportBaseInputAtom, exportBaseNameAtom, exportFormatAtom, exportResultAtom } from "./9-atoms-export";
import { formatSize } from "./2-export-preview";

import { SvgOptions } from "./3-1-options-svg";
import { ReactOptions } from "./3-2-options-react";
import { DataUriOptions } from "./3-3-options-data-uri";
import { PngOptions } from "./3-4-options-png";

/** The option rows of each export format, one file per format */
const OPTIONS_BY_FORMAT: Record<ExportFormatId, ComponentType> = {
    [ExportFormatId.svg]: SvgOptions,
    [ExportFormatId.png]: PngOptions,
    [ExportFormatId.tsx]: ReactOptions,
    [ExportFormatId.dataUri]: DataUriOptions,
};

/** Controls of the dialog, top right: the format's hint, its options, then the file row above the source */
export function ExportOptions() {
    const format = useAtomValue(exportFormatAtom);
    const Options = OPTIONS_BY_FORMAT[format.id];

    return (
        <div className="shrink-0 px-3 py-3 border-b flex flex-col gap-2.5">
            <p className="text-[10px] leading-snug text-muted-foreground">{format.description}</p>
            <Options />
            <ExportFileRow />
        </div>
    );
}

/** The file name, which can be changed, its extension, and the size of the output. Shows the status while rendering. */
function ExportFileRow() {
    const result = useAtomValue(exportResultAtom);
    const [baseInput, setBaseInput] = useAtom(exportBaseInputAtom);
    const baseName = useAtomValue(exportBaseNameAtom);
    const output = result?.ok ? result.output : undefined;

    if (!output) {
        return (
            <div className="flex items-center gap-2 min-w-0 h-7">
                <span className={result && !result.ok ? "text-[10px] text-destructive" : "text-[10px] text-muted-foreground"}>
                    {result ? (result.ok ? '' : result.error) : 'Rendering...'}
                </span>
            </div>
        );
    }

    // The part of the file name after the base name: the extension, and for PNG the scale suffix
    const suffix = output.fileName.startsWith(baseName)
        ? output.fileName.slice(baseName.length)
        : output.fileName.slice(output.fileName.lastIndexOf('.'));

    return (
        <div className="flex items-center gap-2 min-w-0">
            <Input
                className="h-7 min-w-0 flex-1 text-xs"
                value={baseInput}
                onChange={(e) => setBaseInput(e.currentTarget.value)}
                placeholder={baseName}
                spellCheck={false}
                autoComplete="off"
                aria-label="File name"
            />
            <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>
            <span className="shrink-0 ml-auto text-[10px] tabular-nums text-muted-foreground">
                {formatSize(output.kind === 'image' ? output.blob.size : new Blob([output.text]).size)}
            </span>
        </div>
    );
}
