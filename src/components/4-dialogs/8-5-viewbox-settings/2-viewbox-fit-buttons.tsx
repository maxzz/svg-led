import { BoxSelect, Maximize } from "lucide-react";
import { useSetAtom } from "jotai";
import { runCommandAtom } from "@/commands";
import { Button } from "@/ui/shadcn/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { isOpenViewBoxSettingsDialogAtom, isOpenViewBoxSettingsPopoverAtom } from "./9-types-viewbox-settings";

const FIT_ACTIONS = [
    { id: 'viewbox.toContent',    label: 'Fit viewBox to content...',    Icon: Maximize },
    { id: 'viewbox.toSelection',  label: 'Fit viewBox to selection...',  Icon: BoxSelect },
    // { id: 'viewbox.fitSelection', label: 'Fit selection into viewBox...', Icon: Frame }, // This is duplicate that available in the context menu
] as const;

/** Icon buttons that run the viewBox fit commands; each shows its label as a tooltip. Closes the dialog/popover before running. */
export function Buttons_ViewBoxFit() {
    const run = useSetAtom(runCommandAtom);
    const setIsOpenDialog = useSetAtom(isOpenViewBoxSettingsDialogAtom);
    const setIsOpenPopover = useSetAtom(isOpenViewBoxSettingsPopoverAtom);

    function fit(id: string) {
        setIsOpenDialog(false);
        setIsOpenPopover(false);
        run(id);
    }

    return (
        <TooltipProvider>
            <div className="flex gap-1">
                {FIT_ACTIONS.map(({ id, label, Icon }) => (
                    <Tooltip key={id}>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon-sm" type="button" aria-label={label} onClick={() => fit(id)}>
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
