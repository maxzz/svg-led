import { useId } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { motion, useDragControls, useMotionValue } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useSnapshot } from "valtio";
import { appSettings, type OffsetPathDialogSettings } from "@/store/1-ui-settings";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/ui/shadcn/dialog";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { NumberField } from "@/components/1-workspace/2-props-panel/2-props-panel-controls/3-0-number-field";
import { closeOffsetPathDialogAtom, isOpenOffsetPathDialogAtom, offsetSliderOpenAtom } from "./9-atoms-offset-path";
import { OffsetField } from "./1-offset-field";

const labelClasses = "whitespace-nowrap text-xs text-muted-foreground";

export function OffsetPathDialog() {
    const open = useAtomValue(isOpenOffsetPathDialogAtom);
    const close = useSetAtom(closeOffsetPathDialogAtom);
    if (!open) {
        return null;
    }

    return (
        <Dialog open onOpenChange={(next) => { if (!next) close(false); }}>
            <DialogPortal>
                <DialogPrimitive.Overlay className="fixed inset-0 bg-transparent z-50" />
                <DialogPrimitive.Content
                    className="fixed inset-0 outline-none pointer-events-none z-50"
                    aria-describedby={DESCRIPTION_ID}
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <OffsetPathPanel onClose={close} />
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

function OffsetPathPanel({ onClose }: { onClose: (ok: boolean) => void; }) {
    const drag = useDragControls();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const setSliderOpen = useSetAtom(offsetSliderOpenAtom);
    const { dlgOffsetPath } = useSnapshot(appSettings);
    const joinsId = useId();
    const previewId = useId();
    const noMiter = dlgOffsetPath.joins !== 'miter';
    const xLimit = Math.max(80, window.innerWidth / 2 - 80);
    const yLimit = Math.max(60, window.innerHeight / 2 - 60);

    return (
        <motion.div
            className="absolute top-1/2 left-1/2 w-56 text-sm text-foreground bg-background border rounded-lg shadow-lg pointer-events-auto"
            drag
            dragControls={drag}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={{ left: -xLimit, right: xLimit, top: -yLimit, bottom: yLimit }}
            style={{ x, y, translateX: '-50%', translateY: '-50%' }}
            data-dialog="offset-path"
            onPointerDown={(e) => {
                if (!(e.target as Element).closest?.('[data-offset-field]')) {
                    setSliderOpen(false);
                }
            }}
        >
            <div
                className="select-none touch-none px-3 py-1.5 border-b flex items-center cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => drag.start(e)}
            >
                <DialogTitle className="text-sm">Offset Path</DialogTitle>
                <DialogDescription id={DESCRIPTION_ID} className="sr-only">
                    Creates an offset copy of each selected path. The originals stay.
                </DialogDescription>
            </div>

            <form className="px-3 py-2 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); onClose(true); }}>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
                    <span className={labelClasses}>Offset</span>
                    <OffsetField />

                    <Label className={labelClasses} htmlFor={joinsId}>Joins</Label>
                    <Select value={dlgOffsetPath.joins} onValueChange={(value) => { appSettings.dlgOffsetPath.joins = value as OffsetPathDialogSettings['joins']; }}>
                        <SelectTrigger id={joinsId} className="w-full min-w-0" size="sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                            <SelectItem value="miter">Miter</SelectItem>
                            <SelectItem value="round">Round</SelectItem>
                            <SelectItem value="bevel">Bevel</SelectItem>
                        </SelectContent>
                    </Select>

                    <Label className={noMiter ? "whitespace-nowrap text-xs text-muted-foreground/50" : labelClasses}>Miter limit</Label>
                    <NumberField
                        value={dlgOffsetPath.miterLimit}
                        min={1}
                        step={0.5}
                        precision={2}
                        disabled={noMiter}
                        onChange={(value) => { appSettings.dlgOffsetPath.miterLimit = Math.max(1, value); }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id={previewId}
                        checked={dlgOffsetPath.preview}
                        onCheckedChange={(value) => { appSettings.dlgOffsetPath.preview = value === true; }}
                    />
                    <Label className="text-xs font-normal" htmlFor={previewId}>Preview</Label>
                </div>

                <div className="flex justify-end gap-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => onClose(false)}>Cancel</Button>
                    <Button type="submit" size="sm">OK</Button>
                </div>
            </form>
        </motion.div>
    );
}

const DESCRIPTION_ID = "offset-path-dialog-description";
