import { type ReactNode, useId } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { Label } from "@/ui/shadcn/label";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Switch } from "@/ui/shadcn/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";

/**
 * Label linked to its control (clicking it activates the control).
 * Only the label is the tooltip trigger, so the tooltip shows only while the label itself is hovered.
 */
export function Control_Label({ htmlFor, hint, children }: { htmlFor: string; hint: string; children: ReactNode; }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Label className="text-xs" htmlFor={htmlFor}>{children}</Label>
                </TooltipTrigger>

                <TooltipContent side="left" sideOffset={6} className="max-w-64">
                    {hint}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** Settings row (label + control). The control goes on the right, the label keeps its tooltip. */
export function Control_WithHint({ id, label, hint, children }: { id: string; label: string; hint: string; children: ReactNode; }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <Control_Label htmlFor={id} hint={hint}>{label}</Control_Label>
            {children}
        </div>
    );
}

//---------------------------------------------------------------------------

/** Checkbox row (checkbox + label) paired with a tooltip that explains the setting */
export function Control_Checkbox({ label, hint, checked, onCheckedChange }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    const id = useId();

    return (
        <div className="flex items-center gap-2">
            <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
            <Control_Label htmlFor={id} hint={hint}>{label}</Control_Label>
        </div>
    );
}

//---------------------------------------------------------------------------

/** Toggle row (label + switch) paired with a tooltip that explains the setting */
export function Control_Switch({ label, hint, checked, onCheckedChange }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    const id = useId();

    return (
        <Control_WithHint id={id} label={label} hint={hint}>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </Control_WithHint>
    );
}

//---------------------------------------------------------------------------

/** Drop-down row paired with a tooltip that explains the setting */
export function Control_Select({ label, hint, value, items, onValueChange }: { label: string; hint: string; value: number; items: number[]; onValueChange: (n: number) => void; }) {
    const id = useId();

    return (
        <Control_WithHint id={id} label={label} hint={hint}>
            <Select value={String(value)} onValueChange={(v) => onValueChange(Number(v))}>
                <SelectTrigger id={id} className="w-16 tabular-nums" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end" className="min-w-0 w-fit">
                    {items.map((n) => <SelectItem className="tabular-nums" value={String(n)} key={n}>{n}</SelectItem>)}
                </SelectContent>
            </Select>
        </Control_WithHint>
    );
}
