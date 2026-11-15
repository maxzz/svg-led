import { ExportBoundsRow, ExportScopeRow, ExportTailwindRow } from "./2-export-controls";

/** Options of the SVG export */
export function SvgOptions() {
    return (<>
        <ExportScopeRow />
        <ExportBoundsRow />
        <ExportTailwindRow />
    </>);
}
