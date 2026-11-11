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
import { PrefCombo } from "./4-pref-combo";
import { PrefRow } from "./5-pref-row";
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
                <PrefSwitch label="All control handles" hint="Points tool only: show direction handles on every anchor of the selected paths, not just on the selected anchors and their neighbours. Use it to see curves that are otherwise hidden." checked={pointsOptions.showAllHandles} onCheckedChange={(v) => setPointsOptions({ showAllHandles: v })} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <PrefCombo
                    label="Grid size"
                    hint="Spacing between grid lines, in document units. Snap to grid uses the same step. Type any whole number from 1 to 256, or pick a preset."
                    value={prefs.gridSize}
                    presets={GRID_SIZES}
                    min={1}
                    max={256}
                    onValueChange={(n) => { appSettings.prefs.gridSize = n; }}
                />
                <PrefSelect
                    label="Precision"
                    hint="Decimal digits kept for coordinates when the SVG source is written. Fewer digits make a smaller file but less exact shapes. Example: 12.34567 becomes 12.346 at 3 decimals and 12 at 0 (integers)."
                    value={prefs.precision}
                    items={PRECISIONS}
                    onValueChange={(n) => { appSettings.prefs.precision = n; }}
                />
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
        <PrefRow hint={hint}>
            <Label className="text-xs" htmlFor={id}>{label}</Label>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </PrefRow>
    );
}

/** Drop-down row paired with a tooltip that explains the setting */
function PrefSelect({ label, hint, value, items, onValueChange }: { label: string; hint: string; value: number; items: number[]; onValueChange: (n: number) => void; }) {
    const id = useId();

    return (
        <PrefRow hint={hint}>
            <Label className="text-xs" htmlFor={id}>{label}</Label>
            <Select value={String(value)} onValueChange={(v) => onValueChange(Number(v))}>
                <SelectTrigger id={id} className="w-16 tabular-nums" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end" className="min-w-0 w-fit">
                    {items.map((n) => <SelectItem className="tabular-nums" value={String(n)} key={n}>{n}</SelectItem>)}
                </SelectContent>
            </Select>
        </PrefRow>
    );
}
