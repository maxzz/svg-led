import { useId } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Link, Unlink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { type FitViewBoxMode, type PaddingSide, applyFitViewBoxAtom, fitViewBoxDialogAtom, fitViewBoxOptionsAtom, setPaddingSideAtom } from "./9-types-fit-viewbox";

export function FitViewBoxDialog() {
    const [mode, setMode] = useAtom(fitViewBoxDialogAtom);
    const apply = useSetAtom(applyFitViewBoxAtom);
    const [title, description] = mode ? TITLES[mode] : ['', ''];

    return (
        <Dialog open={!!mode} onOpenChange={(open) => { !open && setMode(null); }}>
            <DialogContent className="p-0! max-w-sm! gap-0!">
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">
                        {title}
                        </DialogTitle>
                    <DialogDescription className="text-xs">
                        {description}
                        </DialogDescription>
                </DialogHeader>

                <form className="px-4 py-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); apply(); }}>
                    <PaddingEditor />

                    {mode === 'selection-into-viewbox' && <ScaleOptions />}

                    <DialogFooter className="p-0 m-0 bg-transparent border-0">
                        <Button variant="outline" size="sm" type="button" onClick={() => setMode(null)}>Cancel</Button>
                        <Button size="sm" type="submit">Fit</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const TITLES: Record<FitViewBoxMode, [title: string, description: string]> = {
    'selection-into-viewbox': ['Fit selection to viewBox', 'Scales and moves the selected elements into the viewBox, keeping the padding free.'],
    'viewbox-to-selection': ['Fit viewBox to selection', 'Sets the viewBox around the selected elements with the padding added.'],
    'viewbox-to-content': ['Fit viewBox to content', 'Sets the viewBox around all elements with the padding added.'],
};

function PaddingEditor() {
    const [options, setOptions] = useAtom(fitViewBoxOptionsAtom);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Padding</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOptions({ linked: !options.linked })}
                    title={options.linked ? 'Edit each side separately' : 'Use one value for all sides'}
                    type="button"
                >
                    {options.linked ? <Link className="size-3.5" /> : <Unlink className="size-3.5" />}
                    {options.linked ? 'All sides' : 'Each side'}
                </Button>
            </div>

            {options.linked
                ? <PaddingInput side="top" label="All" />
                : (
                    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
                        <PaddingInput side="top" label="Top" />
                        <PaddingInput side="right" label="Right" />
                        <PaddingInput side="bottom" label="Bottom" />
                        <PaddingInput side="left" label="Left" />
                    </div>
                )
            }
        </div>
    );
}

function PaddingInput({ side, label }: { side: PaddingSide; label: string; }) {
    const options = useAtomValue(fitViewBoxOptionsAtom);
    const setSide = useSetAtom(setPaddingSideAtom);
    const id = useId();

    return (<>
        <Label className="text-xs text-muted-foreground" htmlFor={id}>{label}</Label>
        <Input
            className="h-8 text-xs"
            id={id}
            type="number"
            step="any"
            value={options[side]}
            onChange={(e) => setSide({ side, value: e.currentTarget.valueAsNumber })}
        />
    </>);
}

function ScaleOptions() {
    const [options, setOptions] = useAtom(fitViewBoxOptionsAtom);
    return (
        <div className="flex flex-col gap-2">
            <CheckRow label="Keep aspect ratio" checked={options.keepAspect} onChange={(keepAspect) => setOptions({ keepAspect })} />
            <CheckRow label="Center in the viewBox" checked={options.center} onChange={(center) => setOptions({ center })} />
        </div>
    );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void; }) {
    const id = useId();
    return (
        <div className="flex items-center gap-2">
            <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
            <Label className="text-xs" htmlFor={id}>{label}</Label>
        </div>
    );
}
