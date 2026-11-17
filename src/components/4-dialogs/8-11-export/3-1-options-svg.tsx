import { Row_ExportBounds, Checkbox_FormatSvg, Row_ExportScope, Checkbox_ExportTailwind } from "./7-export-shared-controls";

/** Options of the SVG export */
export function SvgOptions() {
    return (<>
        <Row_ExportScope />
        <Row_ExportBounds />
        <div className="flex items-center gap-8">
            <Checkbox_ExportTailwind />
            <Checkbox_FormatSvg />
        </div>
    </>);
}
