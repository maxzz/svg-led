import { type ComponentType, type ReactNode, useId } from "react";
import { useAtom } from "jotai";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { type ExportControlId, componentNameFor } from "@/transforms/2-export";
import { exportBaseName, exportOptionsAtom } from "./9-atoms-export";

/** Option controls by id; a format lists the ids it needs in `controls` */
export const EXPORT_CONTROLS: Record<ExportControlId, ComponentType> = {
    tailwind: TailwindControl,
    pngScale: PngScaleControl,
    pngBackground: PngBackgroundControl,
    componentName: ComponentNameControl,
    dataUriEncoding: DataUriEncodingControl,
};

//---------------------------------------------------------------------------

function TailwindControl() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    return (
        <CheckboxRow checked={options.tailwind} onChange={(tailwind) => setOptions({ tailwind })}>
            Tailwind classes instead of presentation attributes
        </CheckboxRow>
    );
}

function DataUriEncodingControl() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    return (<>
        <CheckboxRow checked={options.dataUriBase64} onChange={(dataUriBase64) => setOptions({ dataUriBase64 })}>
            Base64 encoding
        </CheckboxRow>
        <CheckboxRow checked={options.dataUriCss} onChange={(dataUriCss) => setOptions({ dataUriCss })}>
            As CSS background-image
        </CheckboxRow>
    </>);
}

function PngScaleControl() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    return (
        <ControlRow label="Scale">
            <TabSelect<string>
                className="p-0.5 bg-muted rounded-md"
                itemClassName="py-1 tabular-nums"
                items={PNG_SCALES.map((n) => ({ value: String(n), label: `${n}x` }))}
                value={String(options.pngScale)}
                onValueChange={(v) => setOptions({ pngScale: Number(v) })}
                orientation="horizontal"
                aria-label="PNG scale"
            />
        </ControlRow>
    );
}

const PNG_SCALES = [1, 2, 3, 4];

function PngBackgroundControl() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    const id = useId();
    return (
        <ControlRow label="Background" htmlFor={id}>
            <Input
                className="h-7 w-28 text-xs"
                id={id}
                value={options.pngBackground}
                onChange={(e) => setOptions({ pngBackground: e.currentTarget.value })}
                placeholder="transparent"
                spellCheck={false}
                autoComplete="off"
            />
        </ControlRow>
    );
}

function ComponentNameControl() {
    const [options, setOptions] = useAtom(exportOptionsAtom);
    const id = useId();
    return (
        <ControlRow label="Name" htmlFor={id}>
            <Input
                className="min-w-0 h-7 text-xs flex-1"
                id={id}
                value={options.componentName}
                onChange={(e) => setOptions({ componentName: e.currentTarget.value })}
                placeholder={componentNameFor('', exportBaseName())}
                spellCheck={false}
                autoComplete="off"
            />
        </ControlRow>
    );
}

//---------------------------------------------------------------------------

function ControlRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode; }) {
    return (
        <div className="flex items-center gap-2">
            <Label className="shrink-0 w-16 text-xs font-normal text-muted-foreground" htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}

function CheckboxRow({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; }) {
    const id = useId();
    return (
        <div className="flex items-center gap-2">
            <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
            <Label className="text-xs font-normal" htmlFor={id}>{children}</Label>
        </div>
    );
}
