import { useId } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { useDocSnapshot } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { NumberField } from "@/components/1-workspace/3-properties/2-controls/3-number-field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Switch } from "@/ui/shadcn/switch";
import { VIEWBOX_PRESETS, addViewBoxAtom, isOpenViewBoxSettingsDialogAtom, setViewBoxAndFitAtom, sizeFromViewBoxAtom } from "./9-types-viewbox-settings";

export function ViewBoxSettingsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenViewBoxSettingsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-md! gap-0!">
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">ViewBox</DialogTitle>
                    <DialogDescription className="text-xs">
                        The viewBox defines the visible area and the coordinate system of the SVG.
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <ViewBoxSettingsBody />}
            </DialogContent>
        </Dialog>
    );
}

function ViewBoxSettingsBody() {
    const doc = useDocSnapshot();
    const { prefs } = useSnapshot(appSettings);
    const setVb = useSetAtom(setViewBoxAndFitAtom);
    const addVb = useSetAtom(addViewBoxAtom);
    const sizeFromVb = useSetAtom(sizeFromViewBoxAtom);
    const run = useSetAtom(runCommandAtom);
    const close = useSetAtom(isOpenViewBoxSettingsDialogAtom);
    const showId = useId();
    const vb = doc.viewBox;

    const fit = (id: string) => {
        close(false);
        run(id);
    };

    return (
        <div className="px-4 py-4 text-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <Label className="text-xs" htmlFor={showId}>Show the viewBox frame on the canvas</Label>
                <Switch id={showId} checked={prefs.showViewBox} onCheckedChange={(v) => { appSettings.prefs.showViewBox = v; }} />
            </div>

            {vb
                ? (<>
                    <div className="grid grid-cols-4 gap-1.5">
                        <NumberField label="X" value={vb.x} onChange={(x) => setVb({ ...vb, x })} />
                        <NumberField label="Y" value={vb.y} onChange={(y) => setVb({ ...vb, y })} />
                        <NumberField label="W" value={vb.width} min={0.01} onChange={(width) => setVb({ ...vb, width })} />
                        <NumberField label="H" value={vb.height} min={0.01} onChange={(height) => setVb({ ...vb, height })} />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground">Square presets</span>
                        <div className="flex flex-wrap gap-1">
                            {VIEWBOX_PRESETS.map((n) => (
                                <Button variant="outline" size="xs" type="button" onClick={() => setVb({ x: 0, y: 0, width: n, height: n })} key={n}>
                                    {n}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" type="button" onClick={() => fit('viewbox.toContent')}>Fit to content...</Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => fit('viewbox.toSelection')}>Fit to selection...</Button>
                        <Button variant="outline" size="sm" type="button" onClick={() => fit('viewbox.fitSelection')}>Fit selection into viewBox...</Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <Button variant="ghost" size="sm" type="button" onClick={sizeFromVb}>
                            Set width and height from viewBox
                        </Button>
                        <Button variant="ghost" size="sm" type="button" className="text-destructive" onClick={() => setVb(null)}>
                            Remove viewBox
                        </Button>
                    </div>
                </>)
                : (
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">The document has no viewBox.</span>
                        <Button size="sm" type="button" onClick={addVb}>Add viewBox</Button>
                    </div>
                )
            }
        </div>
    );
}
