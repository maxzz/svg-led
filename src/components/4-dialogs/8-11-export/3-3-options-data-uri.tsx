import { useAtom } from "jotai";

import { ExportBoundsRow, ExportScopeRow, CheckboxRow } from "./7-export-shared-controls";
import { exportOptionsAtom } from "./9-atoms-export";

/** Options of the Data URI export */
export function DataUriOptions() {
    const [options, setOptions] = useAtom(exportOptionsAtom);

    return (<>
        <ExportScopeRow />
        <ExportBoundsRow />

        <CheckboxRow checked={options.dataUriBase64} onChange={(dataUriBase64) => setOptions({ dataUriBase64 })}>
            Base64 encoding
        </CheckboxRow>

        <CheckboxRow checked={options.dataUriCss} onChange={(dataUriCss) => setOptions({ dataUriCss })}>
            As CSS background-image
        </CheckboxRow>
    </>);
}
