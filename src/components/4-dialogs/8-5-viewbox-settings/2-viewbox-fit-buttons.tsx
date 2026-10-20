import { BoxSelect, Frame, Maximize } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";

const FIT_ACTIONS = [
    { id: 'viewbox.toContent',    label: 'Fit viewBox to content...',    Icon: Maximize },
    { id: 'viewbox.toSelection',  label: 'Fit viewBox to selection...',  Icon: BoxSelect },
    // { id: 'viewbox.fitSelection', label: 'Fit selection into viewBox...', Icon: Frame }, // This is duplicate that available in the context menu
] as const;

/** Icon buttons that run the viewBox fit commands; each shows its label as a tooltip. Rendered inside the viewBox grid. */
export function Buttons_ViewBoxFit({ onFit }: { onFit: (id: string) => void; }) {
    return (
        <TooltipProvider>
            <div className="flex gap-1">
                {FIT_ACTIONS.map(({ id, label, Icon }) => (
                    <Tooltip key={id}>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon-sm" type="button" aria-label={label} onClick={() => onFit(id)}>
                                <Icon />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {label}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    );
}
