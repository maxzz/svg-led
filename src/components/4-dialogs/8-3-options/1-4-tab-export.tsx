import { useId } from "react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Switch } from "@/ui/shadcn/switch";
import { OptionLabel } from "./8-option-label";

export function Tab_Export() {
    return (
        <div className="flex flex-col gap-4">
            <IncludeNoneValuesSwitch />
        </div>
    );
}

function IncludeNoneValuesSwitch() {
    const { exportSvg } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip={<>
                    <div>Applies to SVG export, Copy SVG source, and PNG export, and to <b>fill</b> / <b>stroke</b> set to none in the Properties panel.</div>
                    <div>On: <code>fill="none"</code> and <code>stroke="none"</code> are written.</div>
                    <div>Off: these attributes are left out. A shape with no fill attribute is drawn filled black, so the exported file may look different.</div>
                </>}
            >
                Include none values
            </OptionLabel>

            <Switch id={id} checked={exportSvg.includeNoneValues} onCheckedChange={(v) => { appSettings.exportSvg.includeNoneValues = v; }} />
        </div>
    );
}
