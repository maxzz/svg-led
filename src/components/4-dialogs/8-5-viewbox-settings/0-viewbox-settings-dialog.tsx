import { useId } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { docState, setRootAttr, useDocSnapshot } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { NumberField } from "@/components/1-workspace/3-properties/2-controls/3-number-field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { VIEWBOX_PRESETS, addViewBoxAtom, isOpenViewBoxSettingsDialogAtom, setViewBoxAndFitAtom, sizeFromViewBoxAtom } from "./9-types-viewbox-settings";

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

function Body() {
    const { viewBox, rootAttrs } = useDocSnapshot();
    const { fileName } = useSnapshot(docState);
    const { prefs } = useSnapshot(appSettings);

    const setVb = useSetAtom(setViewBoxAndFitAtom);
    const addVb = useSetAtom(addViewBoxAtom);
    const sizeFromVb = useSetAtom(sizeFromViewBoxAtom);
    const run = useSetAtom(runCommandAtom);
    const close = useSetAtom(isOpenViewBoxSettingsDialogAtom);
    const showId = useId();

    function fit(id: string) {
        close(false);
        run(id);
    }

    return (
        <div className="px-4 py-4 text-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor={showId}>
                    Show the viewBox frame on the canvas
                </Label>
                <Switch id={showId} checked={prefs.showViewBox} onCheckedChange={(v) => { appSettings.prefs.showViewBox = v; }} />
            </div>

            {viewBox
                ? (<>
                    <ViewBoxFields />

                    <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" type="button" onClick={() => fit('viewbox.toContent')}>
                            Fit to content...
                        </Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => fit('viewbox.toSelection')}>
                            Fit to selection...
                        </Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => fit('viewbox.fitSelection')}>
                            Fit selection into viewBox...
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button variant="ghost" size="sm" type="button" onClick={sizeFromVb}>
                            Set width and height from viewBox
                        </Button>
                    </div>
                </>)
                : (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                            The document has no viewBox.
                        </span>
                        <Button size="sm" type="button" onClick={addVb}>
                            Add viewBox
                        </Button>
                    </div>
                )
            }

            <div className="flex flex-col gap-3 pt-3 border-t">
                <span className="text-muted-foreground">
                    File
                </span>

                <div className="text-xs font-medium truncate" title={fileName}>
                    {fileName}
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground">
                        Size attributes
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                        <SizeField label="W" name="width" value={rootAttrs.width} />
                        <SizeField label="H" name="height" value={rootAttrs.height} />
                    </div>
                </div>

                {viewBox && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" type="button" className="text-destructive" onClick={() => setVb(null)}>
                            Remove viewBox
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

/** X/Y/W/H fields and square presets; reads the viewBox and updates it directly */
function ViewBoxFields() {
    const vb = useDocSnapshot().viewBox;
    const setVb = useSetAtom(setViewBoxAndFitAtom);

    if (!vb) return null;

    return (
        <div className="grid grid-cols-[repeat(4,max-content)_1fr] gap-1">
            <NumberField className="max-w-16" label="X" value={vb.x} onChange={(x) => setVb({ ...vb, x })} />
            <NumberField className="max-w-16" label="Y" value={vb.y} onChange={(y) => setVb({ ...vb, y })} />
            <NumberField className="max-w-16" label="W" value={vb.width} min={0.01} onChange={(width) => setVb({ ...vb, width })} />
            <NumberField className="max-w-16" label="H" value={vb.height} min={0.01} onChange={(height) => setVb({ ...vb, height })} />

            <Select onValueChange={(v) => setVb({ x: 0, y: 0, width: Number(v), height: Number(v) })}>
                <SelectTrigger className="justify-self-end min-w-0 tabular-nums" size="sm" aria-label="Square presets">
                    <SelectValue placeholder="Square" />
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    {VIEWBOX_PRESETS.map(
                        (n) => (
                            <SelectItem className="tabular-nums" value={String(n)} key={n}>
                                {n} × {n}
                            </SelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}

/** width/height may hold units ("24px", "100%"), so this is a text field; empty removes the attribute */
function SizeField({ label, name, value }: { label: string; name: string; value: string | undefined; }) {
    return (
        <label className="px-1.5 h-7 min-w-0 text-xs bg-muted/60 focus-within:ring-1 focus-within:ring-(--editor-accent) rounded-md flex items-center gap-1">
            <span className="shrink-0 select-none text-[10px] text-muted-foreground">
                {label}
            </span>

            <input
                className="w-full min-w-0 tabular-nums bg-transparent outline-none"
                defaultValue={value ?? ''}
                placeholder="auto"
                onBlur={(e) => { const v = e.currentTarget.value.trim(); v !== (value ?? '') && setRootAttr(name, v || undefined); }}
                onKeyDown={(e) => { e.key === 'Enter' && e.currentTarget.blur(); }}
                key={value ?? ''}
            />
        </label>
    );
}
