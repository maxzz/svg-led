import { type ComponentType } from "react";
import { useAtomValue } from "jotai";
import { ExportFormatId } from "@/transforms/2-export";
import { exportFormatAtom } from "./9-atoms-export";
import { SvgOptions } from "./3-1-options-svg";
import { PngOptions } from "./3-4-options-png";
import { ReactOptions } from "./3-2-options-react";
import { DataUriOptions } from "./3-3-options-data-uri";

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
