import { type ComponentType } from "react";
import { useAtomValue } from "jotai";
import { ExportFormatId } from "@/transforms/2-export";
import { exportFormatAtom } from "./9-atoms-export";
import { SvgOptions } from "./5-options-svg";
import { PngOptions } from "./5-options-png";
import { ReactOptions } from "./5-options-react";
import { DataUriOptions } from "./5-options-data-uri";

/** The option rows of each export format, one file per format */
const OPTIONS_BY_FORMAT: Record<ExportFormatId, ComponentType> = {
    [ExportFormatId.svg]: SvgOptions,
    [ExportFormatId.png]: PngOptions,
    [ExportFormatId.tsx]: ReactOptions,
    [ExportFormatId.dataUri]: DataUriOptions,
};

/** Options of the selected format, in the top right of the dialog */
export function ExportOptions() {
    const format = useAtomValue(exportFormatAtom);
    const Options = OPTIONS_BY_FORMAT[format.id];

    return (
        <div className="shrink-0 px-3 py-3 border-b flex flex-col gap-2.5">
            <Options />
        </div>
    );
}
