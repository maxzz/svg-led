import { useId } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Input } from "@/ui/shadcn/input";

import { componentNameFor } from "@/transforms/2-export";
import { ExportBoundsRow, ExportScopeRow, ExportTailwindRow, OptionRow } from "./7-export-shared-controls";
import { exportBaseNameAtom, exportOptionsAtom } from "./9-atoms-export";

/** Options of the React export */
export function ReactOptions() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    const baseName = useAtomValue(exportBaseNameAtom);
    const id = useId();

    return (<>
        <ExportScopeRow />
        <ExportBoundsRow />

        <OptionRow label="Name" htmlFor={id}>
            <Input
                className="min-w-0 h-7 text-xs flex-1"
                id={id}
                value={options.componentName}
                onChange={(e) => setOptions({ componentName: e.currentTarget.value })}
                placeholder={componentNameFor('', baseName)}
                spellCheck={false}
                autoComplete="off"
            />
        </OptionRow>

        <ExportTailwindRow />
    </>);
}
