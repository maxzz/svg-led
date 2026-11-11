import { type FocusEvent, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

/**
 * Focus opens a tooltip only for keyboard focus. The popover auto-focuses its first control on open,
 * which would otherwise show that control's tooltip at once; hovering still waits for the delay.
 */
function keyboardFocusOnly(e: FocusEvent<HTMLElement>) {
    if (!(e.target as HTMLElement).matches(':focus-visible')) {
        e.preventDefault();
    }
}

/** Settings row (label + control) paired with a tooltip that explains the setting */
export function PrefRow({ hint, children }: { hint: string; children: ReactNode; }) {
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
