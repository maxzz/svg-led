import { type ReactNode } from "react";
import { CircleQuestionMark } from "lucide-react";
import { Label } from "@/ui/shadcn/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

/**
 * Label for an option row. When `tip` is given, a small help icon follows the text and shows the tip on hover/focus.
 * Usage: <OptionLabel htmlFor={id} tip="Explanation">Option name</OptionLabel>
 */
export function OptionLabel({ htmlFor, tip, children }: { htmlFor: string; tip?: ReactNode; children: ReactNode; }) {
    return (
        <div className="min-w-0 flex items-center gap-1.5">
            <Label htmlFor={htmlFor}>
                {children}
            </Label>

            {tip && <OptionTip>{tip}</OptionTip>}
        </div>
    );
}

/** Help icon with a tooltip. Can be used on its own next to any control. */
export function OptionTip({ children }: { children: ReactNode; }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button className="shrink-0 size-4 flex items-center justify-center text-blue-500 hover:text-blue-600 rounded-full cursor-help" type="button" aria-label="More information">
                        <CircleQuestionMark className="size-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64 text-left leading-snug whitespace-normal">
                    {children}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
