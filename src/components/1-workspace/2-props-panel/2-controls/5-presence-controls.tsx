import { type ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/utils/classnames";
import { type PresenceState } from "./5-presence-state";

/** Small checkbox for the left column of the Properties popup. Shows a square when the selection is mixed. */
export function PresenceCheckbox({ state, label, onChange }: { state: PresenceState; label: string; onChange: (on: boolean) => void; }) {
    return (
        <CheckboxPrimitive.Root
            checked={state}
            onCheckedChange={(checked) => onChange(checked === true)}
            aria-label={label}
            title={label}
            className="relative shrink-0 size-2.5 text-background bg-background data-[state=checked]:bg-(--editor-accent) data-[state=checked]:border-(--editor-accent) data-[state=indeterminate]:bg-(--editor-accent) data-[state=indeterminate]:border-(--editor-accent) focus-visible:ring-1 focus-visible:ring-(--editor-accent) border border-foreground/40 outline-none rounded-[3px] flex items-center justify-center cursor-pointer"
        >
            <CheckboxPrimitive.Indicator className="flex">
                {state === 'indeterminate'
                    ? <span className="size-1 rounded-[1px] bg-current" />
                    : <CheckIcon className="size-2" strokeWidth={3} />}
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

/**
 * Row of the Properties popup with the left column in front of it.
 * The column holds the row's checkbox, or stays empty so the rows still line up.
 */
export function PresenceRow({ check, children, className }: { check?: ReactNode; children: ReactNode; className?: string; }) {
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <div className="w-2.5 shrink-0 flex justify-center">
                {check}
            </div>
            <div className="min-w-0 flex-1">
                {children}
            </div>
        </div>
    );
}
