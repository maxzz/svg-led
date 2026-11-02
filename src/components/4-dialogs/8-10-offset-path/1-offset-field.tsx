import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { getNodeProxy } from "@/store/3-document";
import { localBBox } from "@/svg-core";
import { Slider } from "@/ui/shadcn/slider";
import { NumberField } from "@/components/1-workspace/2-props-panel/2-props-panel-controls/3-0-number-field";
import { offsetLiveAtom, offsetPathTargetIdsAtom, offsetSliderOpenAtom } from "./9-atoms-offset-path";

/**
 * Offset distance. Focusing the field opens a slider, as the corner and miter fields do
 * in the Properties panel. The slider stays inside the dialog: a portaled popup is dismissed
 * by the modal layer. Typing updates the preview immediately and commits on Enter or blur.
 */
export function OffsetField() {
    const { dlgOffsetPath } = useSnapshot(appSettings);
    const [open, setOpen] = useAtom(offsetSliderOpenAtom);
    const live = useAtomValue(offsetLiveAtom);
    const setLive = useSetAtom(offsetLiveAtom);
    const ids = useAtomValue(offsetPathTargetIdsAtom);
    const shown = live ?? dlgOffsetPath.offset;

    let span = 10;
    for (const id of ids) {
        const node = getNodeProxy(id);
        const box = node && localBBox(node);
        if (box) {
            span = Math.max(span, box.width, box.height);
        }
    }
    const limit = Math.max(span, Math.abs(shown));

    function commit(value: number) {
        appSettings.dlgOffsetPath.offset = value;
        setLive(null);
    }

    return (
        <div className="relative" data-offset-field onPointerDown={() => setOpen(true)}>
            <NumberField
                value={dlgOffsetPath.offset}
                step={1}
                precision={3}
                onFocus={() => setOpen(true)}
                onInput={setLive}
                onChange={commit}
            />
            {open && (
                <div className="absolute top-full left-0 mt-1 p-2 w-full bg-popover border rounded-md shadow-md z-10">
                    <Slider
                        aria-label="Offset"
                        min={-limit}
                        max={limit}
                        step={limit > 200 ? 1 : 0.1}
                        value={[Math.min(limit, Math.max(-limit, shown))]}
                        onValueChange={([value]) => commit(value)}
                    />
                </div>
            )}
        </div>
    );
}
