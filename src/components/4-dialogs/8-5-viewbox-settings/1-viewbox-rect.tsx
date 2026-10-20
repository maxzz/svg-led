import { useState } from "react";
import { useSetAtom } from "jotai";
import { useDocSnapshot } from "@/store/3-document";
import { NumberField } from "@/components/1-workspace/2-props-panel/2-controls/3-number-field";
import { Button } from "@/ui/shadcn/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { VIEWBOX_PRESETS, addViewBoxAtom, setViewBoxAndFitAtom } from "./9-types-viewbox-settings";

/** X/Y/W/H fields (when a viewBox exists) and the square presets list with None/Custom */
export function Controls_ViewBoxRect() {
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
