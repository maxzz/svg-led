import { type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { topLevelIds } from "@/store/3-document";
import { type ExportBounds, type ExportFormatId, type ExportScope, EXPORT_FORMATS } from "@/transforms/2-export";
import { exportFormatAtom, exportOptionsAtom, exportScopeAtom, exportSelectedCountAtom } from "./9-atoms-export";
import { EXPORT_CONTROLS } from "./2-export-controls";

/** Left column: format, what to export, and the options of the format */
export function ExportSettings() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    const format = useAtomValue(exportFormatAtom);
    const scope = useAtomValue(exportScopeAtom);
    const selectedCount = useAtomValue(exportSelectedCountAtom);

    const formats = EXPORT_FORMATS.map((f) => ({
        value: f.id,
        label: (
            <span className="flex flex-col">
                <span className="font-medium">{f.label}</span>
                <span className="text-[10px] text-muted-foreground">{f.description}</span>
            </span>
        ),
    }));
    const scopes = [
        { value: 'selection', label: `Selected (${selectedCount})`, disabled: !selectedCount },
        { value: 'all', label: `All (${topLevelIds().length})` },
    ] as const;

    return (
        <div className="shrink-0 w-64 min-h-0 bg-muted/30 border-r overflow-y-auto flex flex-col">
            <TabSelect<ExportFormatId>
                items={formats}
                value={format.id}
                onValueChange={(id) => setOptions({ format: id })}
                orientation="vertical"
                aria-label="Export format"
            />

            <div className="px-3 py-3 border-t flex flex-col gap-2.5">
                <Field label="Elements">
                    <TabSelect<ExportScope>
                        className="p-0.5 bg-muted rounded-md"
                        itemClassName="py-1"
                        items={scopes}
                        value={scope}
                        onValueChange={(value) => setOptions({ scope: value })}
                        orientation="horizontal"
                        aria-label="Elements to export"
                    />
                </Field>

                <Field label="Bounds">
                    <TabSelect<ExportBounds>
                        className="p-0.5 bg-muted rounded-md"
                        itemClassName="py-1"
                        items={BOUNDS}
                        value={options.bounds}
                        onValueChange={(bounds) => setOptions({ bounds })}
                        orientation="horizontal"
                        aria-label="Export bounds"
                    />
                </Field>

                {format.controls.map(
                    (id) => {
                        const Control = EXPORT_CONTROLS[id];
                        return <Control key={id} />;
                    }
                )}
            </div>
        </div>
    );
}

const BOUNDS = [
    { value: 'viewBox', label: 'ViewBox' },
    { value: 'content', label: 'Fit content' },
] as const;

function Field({ label, children }: { label: string; children: ReactNode; }) {
    return (
        <div className="flex items-center gap-2">
            <span className="shrink-0 w-16 text-xs text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}
