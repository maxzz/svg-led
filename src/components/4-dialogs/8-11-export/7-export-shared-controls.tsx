import { type ReactNode, useId } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { topLevelIds } from "@/store/3-document";
import { type ExportBounds, ExportFormatId, type ExportScope } from "@/transforms/2-export";
import { exportFormatAtom, exportFrameAtom, exportOptionsAtom, exportScopeAtom, exportSelectedCountAtom, visibleTopLevelIds } from "./9-atoms-export";

/** Option rows shared by the per-format option files: Elements, Bounds, and the checkbox and label helpers */

//---------------------------------------------------------------------------

export function ExportScopeRow() {
    const scope = useAtomValue(exportScopeAtom);
    const format = useAtomValue(exportFormatAtom);
    const selectedCount = useAtomValue(exportSelectedCountAtom);
    const setOptions = useSetAtom(exportOptionsAtom);

    const scopes: { value: ExportScope; label: string; disabled?: boolean; }[] = [
        { value: 'selection', label: `Selected (${selectedCount})`, disabled: !selectedCount },
        { value: 'visible', label: `Visible (${visibleTopLevelIds().length})` },
        // The editor's own text is an SVG file only
        ...(format.id === ExportFormatId.svg ? [{ value: 'editor' as const, label: `All (${topLevelIds().length})` }] : []),
    ];

    return (
        <OptionRow label="Elements">
            <TabSelect<ExportScope>
                className="p-0.5 bg-muted rounded-md"
                itemClassName="py-1"
                items={scopes}
                value={scope}
                onValueChange={(value) => setOptions({ scope: value })}
                orientation="horizontal"
                aria-label="Elements to export"
            />
        </OptionRow>
    );
}

//---------------------------------------------------------------------------

export function ExportBoundsRow() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    const frame = useAtomValue(exportFrameAtom);
    return (
        <OptionRow label="Bounds">
            <TabSelect<ExportBounds>
                className="p-0.5 bg-muted rounded-md"
                itemClassName="py-1"
                items={BOUNDS}
                value={options.bounds}
                onValueChange={(bounds) => setOptions({ bounds })}
                orientation="horizontal"
                aria-label="Export bounds"
            />
            {frame && <span className="text-[10px] whitespace-nowrap tabular-nums text-muted-foreground">{frame.label}</span>}
        </OptionRow>
    );
}

const BOUNDS = [
    { value: 'viewBox', label: 'ViewBox' },
    { value: 'content', label: 'Fit content' },
] as const;

//---------------------------------------------------------------------------

export function ExportTailwindRow() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    return (
        <CheckboxRow checked={options.tailwind} onChange={(tailwind) => setOptions({ tailwind })}>
            Tailwind classes instead of presentation attributes
        </CheckboxRow>
    );
}

//---------------------------------------------------------------------------

/** A labeled row: fixed-width label, then the control */
export function OptionRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode; }) {
    return (
        <div className="flex items-center gap-2">
            <Label className="shrink-0 w-16 text-xs font-normal text-muted-foreground" htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}

export function CheckboxRow({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; }) {
    const id = useId();
    return (
        <div className="flex items-center gap-2">
            <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
            <Label className="text-xs font-normal" htmlFor={id}>{children}</Label>
        </div>
    );
}
