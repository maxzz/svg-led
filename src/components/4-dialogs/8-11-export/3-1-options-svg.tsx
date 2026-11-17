import { ExportBoundsRow, ExportFormatSvgRow, ExportScopeRow, ExportTailwindRow } from "./7-export-shared-controls";

/** Options of the SVG export */
export function SvgOptions() {
    return (<>
        <ExportScopeRow />
        <ExportBoundsRow />
        <ExportTailwindRow />
        <ExportFormatSvgRow />
    </>);
}
