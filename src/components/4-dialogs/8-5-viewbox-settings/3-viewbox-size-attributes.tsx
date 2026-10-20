import { useSetAtom } from "jotai";
import { setRootAttr, useDocSnapshot } from "@/store/3-document";
import { cn } from "@/utils/classnames";
import { fieldDividerClasses, fieldInputClasses, fieldLabelClasses, fieldShellClasses } from "@/components/1-workspace/2-props-panel/2-controls/3-number-field";
import { Button } from "@/ui/shadcn/button";
import { sizeFromViewBoxAtom } from "./9-types-viewbox-settings";

/** "Size attributes" section: width/height text fields and a button to match the viewBox size */
export function Controls_SvgSizeAttributes() {
    const { viewBox, rootAttrs } = useDocSnapshot();
    const sizeFromVb = useSetAtom(sizeFromViewBoxAtom);

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">
                Size attributes
            </span>
            <div className="flex items-center gap-1.5">
                <SvgSizeInput label="W" name="width" value={rootAttrs.width} />
                <SvgSizeInput label="H" name="height" value={rootAttrs.height} />
                <Button variant="outline" size="sm" type="button" className="shrink-0 h-7" disabled={!viewBox} onClick={sizeFromVb}>
                    Match viewBox
                </Button>
            </div>
        </div>
    );
}

/** width/height may hold units ("24px", "100%"), so this is a text field; empty removes the attribute */
function SvgSizeInput({ label, name, value }: { label: string; name: string; value: string | undefined; }) {
    return (
        <label className={cn(fieldShellClasses, "flex-1")}>
            <span className={fieldLabelClasses}>
                {label}
            </span>
            <span className={fieldDividerClasses} aria-hidden />

            <input
                className={fieldInputClasses}
                defaultValue={value ?? ''}
                placeholder="auto"
                onBlur={(e) => { const v = e.currentTarget.value.trim(); v !== (value ?? '') && setRootAttr(name, v || undefined); }}
                onKeyDown={(e) => { e.key === 'Enter' && e.currentTarget.blur(); }}
                key={value ?? ''}
            />
        </label>
    );
}
