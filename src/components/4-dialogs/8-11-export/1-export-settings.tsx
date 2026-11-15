import { useAtomValue, useSetAtom } from "jotai";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { type ExportFormatId, EXPORT_FORMATS } from "@/transforms/2-export";
import { exportFormatAtom, exportOptionsAtom } from "./9-atoms-export";

const FORMATS = EXPORT_FORMATS.map((f) => ({
    value: f.id,
    label: (
        <span className="flex flex-col">
            <span className="font-medium">{f.label}</span>
            <span className="text-[10px] text-muted-foreground">{f.description}</span>
        </span>
    ),
}));

/** Top of the left column: the export formats */
export function ExportFormatList() {
    const format = useAtomValue(exportFormatAtom);
    const setOptions = useSetAtom(exportOptionsAtom);

    return (
        <TabSelect<ExportFormatId>
            items={FORMATS}
            value={format.id}
            onValueChange={(id) => setOptions({ format: id })}
            orientation="vertical"
            aria-label="Export format"
        />
    );
}
