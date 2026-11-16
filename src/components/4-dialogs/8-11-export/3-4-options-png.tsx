import { useId } from "react";
import { useAtom } from "jotai";
import { Input } from "@/ui/shadcn/input";
import { TabSelect } from "@/ui/local-ui/5-tab-select";

import { ExportBoundsRow, ExportScopeRow, OptionRow } from "./7-export-shared-controls";
import { exportOptionsAtom } from "./9-atoms-export";

const PNG_SCALES = [1, 2, 3, 4];

/** Options of the PNG export */
export function PngOptions() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    const id = useId();

    return (<>
        <ExportScopeRow />
        <ExportBoundsRow />

        <OptionRow label="Scale">
            <TabSelect<string>
                className="p-0.5 bg-muted rounded-md"
                itemClassName="py-1 tabular-nums"
                items={PNG_SCALES.map((n) => ({ value: String(n), label: `${n}x` }))}
                value={String(options.pngScale)}
                onValueChange={(v) => setOptions({ pngScale: Number(v) })}
                orientation="horizontal"
                aria-label="PNG scale"
            />
        </OptionRow>

        <OptionRow label="Background" htmlFor={id}>
            <Input
                className="h-7 w-28 text-xs"
                id={id}
                value={options.pngBackground}
                onChange={(e) => setOptions({ pngBackground: e.currentTarget.value })}
                placeholder="transparent"
                spellCheck={false}
                autoComplete="off"
            />
        </OptionRow>
    </>);
}
