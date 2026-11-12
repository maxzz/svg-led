import { type ReactNode } from "react";
import { useAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";

import { CollapsibleSection } from "@/components/1-workspace/2-props-panel/2-props-panel-controls/2-section";
import { Contron_Combo } from "./7-1-control-combo";
import { Control_Checkbox } from "./7-0-viewbox-controls";
import { Controls_ViewBoxRect } from "./1-viewbox-rect";
import { Controls_SvgSizeAttributes } from "./3-viewbox-size-attributes";

import { docState } from "@/store/3-document";
import { pointsOptionsAtom } from "@/tools/tool-3-points/a-options";
import { isOpenViewBoxSettingsDialogAtom, isOpenViewBoxSettingsPopoverAtom } from "./a-types-viewbox-settings";

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
                <div className="px-4 py-2 border-b text-sm font-medium">
                    ViewBox
                </div>

                <Body />
                <PopoverArrow className="size-4" />
            </PopoverContent>
        </Popover>
    );
}

//---------------------------------------------------------------------------

function Body() {
    const { prefs } = useSnapshot(appSettings);
    const [pointsOptions, setPointsOptions] = useAtom(pointsOptionsAtom);

    return (
        <div className="px-4 pt-2 pb-3 text-xs flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-x-4">
                <Control_Checkbox label="Use viewBox" hint="Show the viewBox outline on the canvas" checked={prefs.showViewBox} onCheckedChange={(v) => { appSettings.prefs.showViewBox = v; }} />
                <Control_Checkbox label="Show rulers" hint="Draw rulers in viewBox units along the top and left edges of the viewBox outline. Requires Use viewBox." checked={prefs.showRulers} disabled={!prefs.showViewBox} onCheckedChange={(v) => { appSettings.prefs.showRulers = v; }} />
            </div>

            <AnimatePresence initial={false}>
                {prefs.showViewBox && (
                    <motion.div
                        className="overflow-hidden -mx-1 px-1"
                        initial={{ height: 0, opacity: 0, marginTop: -BODY_GAP_PX, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: -BODY_RING_PX, marginBottom: -BODY_RING_PX, paddingTop: BODY_RING_PX, paddingBottom: BODY_RING_PX }}
                        exit={{ height: 0, opacity: 0, marginTop: -BODY_GAP_PX, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        <Controls_ViewBoxRect />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-3 border-t flex flex-col">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Control_Checkbox label="Show grid" hint="Draw the background grid on the canvas" checked={prefs.showGrid} onCheckedChange={(v) => { appSettings.prefs.showGrid = v; }} />
                    <Contron_Combo
                        label="Grid size"
                        hint="Spacing between grid lines, in document units. Snap to grid uses the same step. Type any whole number from 1 to 256, or pick a preset."
                        value={prefs.gridSize}
                        presets={GRID_SIZES}
                        min={1}
                        max={256}
                        onValueChange={(n) => { appSettings.prefs.gridSize = n; }}
                    />
                </div>

                <Control_Checkbox label="Snap to grid" hint="Snap points to the nearest grid line while editing" checked={prefs.snapToGrid} onCheckedChange={(v) => { appSettings.prefs.snapToGrid = v; }} />
                <Control_Checkbox label="Snap to objects" hint="Snap to other objects while dragging (hold Ctrl to snap when this is off)" checked={prefs.snapToObjects} onCheckedChange={(v) => { appSettings.prefs.snapToObjects = v; }} />
                <Control_Checkbox label="All control handles" hint="Points tool only: show direction handles on every anchor of the selected paths, not just on the selected anchors and their neighbours. Use it to see curves that are otherwise hidden." checked={pointsOptions.showAllHandles} onCheckedChange={(v) => setPointsOptions({ showAllHandles: v })} />
            </div>

            <div className="pt-3 border-t">
                <FileSection />
            </div>
        </div>
    );
}

const GRID_SIZES = [1, 5, 8, 10, 16, 20, 32];

/** Gap between rows in `Body` (gap-2 = 0.5rem). Must match, so the collapsed rect leaves no gap behind. */
const BODY_GAP_PX = 8;
/** Room for focus rings inside the collapsible area, which its overflow-hidden would otherwise clip. Offset by negative margins, so the layout does not change. */
const BODY_RING_PX = 4;

//---------------------------------------------------------------------------

function FileSection() {
    const { fileName } = useSnapshot(docState);
    const { propertySections } = useSnapshot(appSettings);

    return (
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
    );
}
