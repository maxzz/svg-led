import { type ReactNode, useId } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { isOpenViewBoxSettingsDialogAtom, isOpenViewBoxSettingsPopoverAtom } from "./9-types-viewbox-settings";
import { Controls_ViewBoxRect } from "./1-viewbox-rect";
import { Controls_SvgSizeAttributes } from "./3-viewbox-size-attributes";

export function ViewBoxSettingsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenViewBoxSettingsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-100! gap-0!">
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">
                        ViewBox
                    </DialogTitle>
                    <DialogDescription className="text-xs sr-only">
                        The viewBox defines the visible area and the coordinate system of the SVG.
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <Body />}
            </DialogContent>
        </Dialog>
    );
}

/** Same settings as the dialog, shown as a popover anchored to its child (e.g. a toolbar button) */
export function ViewBoxSettingsPopover({ children }: { children: ReactNode; }) {
    const [isOpen, setIsOpen] = useAtom(isOpenViewBoxSettingsPopoverAtom);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>

            <PopoverContent className="p-0 max-w-100 gap-0" align="start" side="bottom" collisionPadding={{ right: 12 }} sideOffset={-2}>
                <div className="px-4 py-3 border-b text-sm font-medium">
                    ViewBox
                </div>

                <Body />
                <PopoverArrow className="size-4" />
            </PopoverContent>
        </Popover>
    );
}

function Body() {
    const { fileName } = useSnapshot(docState);
    const { prefs } = useSnapshot(appSettings);

    const showId = useId();

    return (
        <div className="px-4 py-4 text-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor={showId}>
                    Use viewBox
                </Label>
                <Switch id={showId} checked={prefs.showViewBox} onCheckedChange={(v) => { appSettings.prefs.showViewBox = v; }} />
            </div>

            <Controls_ViewBoxRect />

            <div className="flex flex-col gap-3 pt-3 border-t">
                <span className="text-muted-foreground">
                    File
                </span>

                <div className="text-xs font-medium truncate" title={fileName}>
                    {fileName}
                </div>

                <Controls_SvgSizeAttributes />
            </div>
        </div>
    );
}
