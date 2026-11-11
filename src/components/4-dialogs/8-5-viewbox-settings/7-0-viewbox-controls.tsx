import { type FocusEvent, type ReactNode, useId } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { Label } from "@/ui/shadcn/label";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Switch } from "@/ui/shadcn/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";

/** Settings row (label + control) paired with a tooltip that explains the setting */
export function Control_WithHint({ hint, children }: { hint: string; children: ReactNode; }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-2" onFocus={keyboardFocusOnly}>
                        {children}
                    </div>
                </TooltipTrigger>

                <TooltipContent side="left" sideOffset={6} className="max-w-64">
                    {hint}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Focus opens a tooltip only for keyboard focus. The popover auto-focuses its first control on open,
 * which would otherwise show that control's tooltip at once; hovering still waits for the delay.
 */
function keyboardFocusOnly(e: FocusEvent<HTMLElement>) {
    if (!(e.target as HTMLElement).matches(':focus-visible')) {
        e.preventDefault();
    }
}


//---------------------------------------------------------------------------

/** Checkbox row (label + checkbox) paired with a tooltip that explains the setting */
export function Control_Checkbox({ label, hint, checked, onCheckedChange }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    const id = useId();

    return (
        <Control_WithHint hint={hint}>
            <Label className="text-xs" htmlFor={id}>{label}</Label>
            <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </Control_WithHint>
    );
}

//---------------------------------------------------------------------------

/** Toggle row (label + switch) paired with a tooltip that explains the setting */
export function Control_Switch({ label, hint, checked, onCheckedChange }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    const id = useId();

    return (
        <Control_WithHint hint={hint}>
            <Label className="text-xs" htmlFor={id}>{label}</Label>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </Control_WithHint>
    );
}

//---------------------------------------------------------------------------

/** Drop-down row paired with a tooltip that explains the setting */
export function Control_Select({ label, hint, value, items, onValueChange }: { label: string; hint: string; value: number; items: number[]; onValueChange: (n: number) => void; }) {
    const id = useId();

    return (
        <Control_WithHint hint={hint}>
            <Label className="text-xs" htmlFor={id}>{label}</Label>
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
