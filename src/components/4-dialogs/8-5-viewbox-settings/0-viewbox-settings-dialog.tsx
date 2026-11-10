import { type ReactNode, useId } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { pointsOptionsAtom } from "@/tools/tool-3-points/a-options";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { CollapsibleSection } from "@/components/1-workspace/2-props-panel/2-props-panel-controls/2-section";
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

/**
 * Same settings as the dialog, shown as a popover anchored to its child (e.g. a toolbar button).
 * Modal, so an outside click only closes it and never reaches the canvas (the selection stays).
 */
export function ViewBoxSettingsPopover({ children }: { children: ReactNode; }) {
    const [isOpen, setIsOpen] = useAtom(isOpenViewBoxSettingsPopoverAtom);

    return (
        <Popover modal open={isOpen} onOpenChange={setIsOpen}>
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
    const { prefs, propertySections } = useSnapshot(appSettings);
    const pointsOptions = useAtomValue(pointsOptionsAtom);
    const setPointsOptions = useSetAtom(pointsOptionsAtom);

    return (
        <div className="px-4 py-4 text-xs flex flex-col gap-4">
            <PrefSwitch label="Use viewBox" hint="Show the viewBox outline on the canvas" checked={prefs.showViewBox} onCheckedChange={(v) => { appSettings.prefs.showViewBox = v; }} />

            <Controls_ViewBoxRect />

            <div className="pt-3 border-t grid grid-cols-2 gap-x-4 gap-y-3">
                <PrefSwitch label="Show grid" hint="Draw the background grid on the canvas" checked={prefs.showGrid} onCheckedChange={(v) => { appSettings.prefs.showGrid = v; }} />
                <PrefSwitch label="Snap to grid" hint="Snap points to the nearest grid line while editing" checked={prefs.snapToGrid} onCheckedChange={(v) => { appSettings.prefs.snapToGrid = v; }} />
                <PrefSwitch label="Snap to objects" hint="Snap to other objects while dragging (hold Ctrl to snap when this is off)" checked={prefs.snapToObjects} onCheckedChange={(v) => { appSettings.prefs.snapToObjects = v; }} />
                <PrefSwitch label="All control handles" hint="Show direction handles for all points, not only for the selected ones" checked={pointsOptions.showAllHandles} onCheckedChange={(v) => setPointsOptions({ showAllHandles: v })} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <PrefSelect label="Grid size" value={prefs.gridSize} items={GRID_SIZES} onValueChange={(n) => { appSettings.prefs.gridSize = n; }} />
                <PrefSelect label="Precision" value={prefs.precision} items={PRECISIONS} suffix=" dec." onValueChange={(n) => { appSettings.prefs.precision = n; }} />
            </div>

            <div className="pt-3 border-t">
                <CollapsibleSection
                    title="File"
                    gutter={false}
                    open={propertySections.viewBoxFileOpen}
                    onOpenChange={(open) => { appSettings.propertySections.viewBoxFileOpen = open; }}
                >
                    <div className="flex flex-col gap-3">
                        <div className="text-xs font-medium truncate" title={fileName}>
                            {fileName}
                        </div>

                        <Controls_SvgSizeAttributes />
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}

const GRID_SIZES = [1, 5, 8, 10, 16, 20, 32];
const PRECISIONS = [0, 1, 2, 3, 4];

/** Toggle row (label + switch) paired with a tooltip that explains the setting */
function PrefSwitch({ label, hint, checked, onCheckedChange }: { label: string; hint: string; checked: boolean; onCheckedChange: (v: boolean) => void; }) {
    const id = useId();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs" htmlFor={id}>{label}</Label>
                        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={6}>
                    {hint}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function PrefSelect({ label, value, items, suffix = "", onValueChange }: { label: string; value: number; items: number[]; suffix?: string; onValueChange: (n: number) => void; }) {
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-2">
            <Label className="text-xs" htmlFor={id}>{label}</Label>
            <Select value={String(value)} onValueChange={(v) => onValueChange(Number(v))}>
                <SelectTrigger id={id} className="w-24 tabular-nums" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    {items.map((n) => <SelectItem className="tabular-nums" value={String(n)} key={n}>{n}{suffix}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}
