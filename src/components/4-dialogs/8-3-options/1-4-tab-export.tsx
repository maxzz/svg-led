import { useId } from "react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { OptionLabel } from "./8-option-label";

/** SVG export options. New settings are added here. */
export function Tab_Export() {
    return (
        <div className="flex flex-col gap-2">
            <PrecisionSelect />
        </div>
    );
}

//---------------------------------------------------------------------------

function PrecisionSelect() {
    const { prefs } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip="Decimal digits kept for coordinates when the SVG source is written. Fewer digits make a smaller file but less exact shapes. Example: 12.34567 becomes 12.346 at 3 decimals and 12 at 0 (integers)."
            >
                Precision
            </OptionLabel>

            <Select value={String(prefs.precision)} onValueChange={(v) => { appSettings.prefs.precision = Number(v); }}>
                <SelectTrigger id={id} className="w-16 tabular-nums" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end" className="min-w-0 w-fit">
                    {PRECISIONS.map((n) => <SelectItem className="tabular-nums" value={String(n)} key={n}>{n}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

const PRECISIONS = [0, 1, 2, 3, 4];

//---------------------------------------------------------------------------
