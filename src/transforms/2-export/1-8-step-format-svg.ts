import { formatSvgText } from "@/svg-core";
import { type ExportStep } from "./9-export-types";

//---------------------------------------------------------------------------

/** Pretty-prints the SVG text when the "Format exported file" option is on; text that is not well-formed is kept as it is */
export const formatSvgStep: ExportStep = {
    id: 'format-svg',
    label: 'SVG text formatted (one tag per line, indented by depth)',
    enabled: (options) => options.formatSvg,
    apply: (svg) => formatSvgText(svg) ?? svg,
};

//---------------------------------------------------------------------------
