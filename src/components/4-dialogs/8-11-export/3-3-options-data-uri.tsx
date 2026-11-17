import { useAtom } from "jotai";

import { Row_ExportBounds, Row_ExportScope, Row_Checkbox } from "./7-export-shared-controls";
import { exportOptionsAtom } from "./9-atoms-export";

/** Options of the Data URI export */
export function DataUriOptions() {
    const [options, setOptions] = useAtom(exportOptionsAtom);

    return (<>
        <Row_ExportScope />
        <Row_ExportBounds />

        <Row_Checkbox checked={options.dataUriBase64} onChange={(dataUriBase64) => setOptions({ dataUriBase64 })}>
            Base64 encoding
        </Row_Checkbox>

        <Row_Checkbox checked={options.dataUriCss} onChange={(dataUriCss) => setOptions({ dataUriCss })}>
            As CSS background-image
        </Row_Checkbox>
    </>);
}
