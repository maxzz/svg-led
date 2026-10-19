import { type ReactNode, useId, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { docState, setRootAttr, useDocSnapshot } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { NumberField } from "@/components/1-workspace/2-props-panel/2-controls/3-number-field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { VIEWBOX_PRESETS, addViewBoxAtom, isOpenViewBoxSettingsDialogAtom, isOpenViewBoxSettingsPopoverAtom, setViewBoxAndFitAtom, sizeFromViewBoxAtom } from "./9-types-viewbox-settings";

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

                {isOpen && <Body onDone={() => setIsOpen(false)} />}
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

            <PopoverContent className="p-0 w-100 gap-0" align="end" side="bottom" sideOffset={6}>
                <div className="px-4 py-3 border-b text-sm font-medium">
                    ViewBox
                </div>

                <Body onDone={() => setIsOpen(false)} />
            </PopoverContent>
        </Popover>
    );
}

function Body({ onDone }: { onDone: () => void; }) {
    const { viewBox, rootAttrs } = useDocSnapshot();
    const { fileName } = useSnapshot(docState);
    const { prefs } = useSnapshot(appSettings);

    const sizeFromVb = useSetAtom(sizeFromViewBoxAtom);
    const run = useSetAtom(runCommandAtom);
    const showId = useId();

    function fit(id: string) {
        onDone();
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

            <ViewBoxFields />

            {viewBox
                ? (<>
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
                    <span className="text-muted-foreground">
                        The document has no viewBox.
                    </span>
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
            </div>
        </div>
    );
}

/** X/Y/W/H fields (when a viewBox exists) and the square presets list with None/Custom */
function ViewBoxFields() {
    const vb = useDocSnapshot().viewBox;
    const setVb = useSetAtom(setViewBoxAndFitAtom);
    const addVb = useSetAtom(addViewBoxAtom);

    // Draft values for the X/Y/W/H fields; applied only by the Apply button.
    // Reset whenever the viewBox changes from outside (presets, undo, canvas, Custom).
    const [draft, setDraft] = useState(vb);
    const [prevVb, setPrevVb] = useState(vb);
    if (vb !== prevVb) {
        setPrevVb(vb);
        setDraft(vb);
    }

    const isDirty = !!vb && !!draft && (draft.x !== vb.x || draft.y !== vb.y || draft.width !== vb.width || draft.height !== vb.height);
    // Shown value: "None" without a viewBox, the matching preset size, or "Custom" for any other size
    const selectValue = !vb
        ? "none"
        : vb.width === vb.height && VIEWBOX_PRESETS.includes(vb.width)
            ? String(vb.width)
            : "custom";

    /** Live edit of one draft field; fields show the applied value, so typing isn't re-keyed */
    const editDraft = (k: "x" | "y" | "width" | "height") => (n: number) => setDraft((d) => (d ? { ...d, [k]: n } : d));

    function onPick(v: string) {
        if (v === 'none') {
            setVb(null);
        } else if (v === 'custom') {
            addVb();
        } else {
            setVb({ x: 0, y: 0, width: Number(v), height: Number(v) });
        }
    }

    return (
        <div className="grid grid-cols-[repeat(4,max-content)_1fr] gap-1">
            {vb && (<>
                <NumberField className="max-w-16" label="X" value={vb.x} onInput={editDraft("x")} onChange={editDraft("x")} />
                <NumberField className="max-w-16" label="Y" value={vb.y} onInput={editDraft("y")} onChange={editDraft("y")} />
                <NumberField className="max-w-16" label="W" value={vb.width} min={0.01} onInput={editDraft("width")} onChange={editDraft("width")} />
                <NumberField className="max-w-16" label="H" value={vb.height} min={0.01} onInput={editDraft("height")} onChange={editDraft("height")} />
            </>)}

            <div className={vb ? "relative min-w-0 justify-self-end" : "relative min-w-0 justify-self-end col-span-full"}>
                <Select value={selectValue} onValueChange={onPick}>
                    <SelectTrigger className="min-w-0 tabular-nums" size="sm" aria-label="Square presets">
                        <SelectValue placeholder="Square" />
                    </SelectTrigger>

                    <SelectContent position="popper" align="end">
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                        {VIEWBOX_PRESETS.map(
                            (n) => (
                                <SelectItem className="tabular-nums" value={String(n)} key={n}>
                                    {n} × {n}
                                </SelectItem>
                            )
                        )}
                    </SelectContent>
                </Select>

                {isDirty && (
                    <Button size="sm" type="button" className="absolute inset-0 w-full tabular-nums" onClick={() => { if (draft) setVb(draft); }}>
                        Apply
                    </Button>
                )}
            </div>
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
