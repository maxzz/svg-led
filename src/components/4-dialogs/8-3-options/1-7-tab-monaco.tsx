import { useId } from "react";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Slider } from "@/ui/shadcn/slider";
import { Switch } from "@/ui/shadcn/switch";

export function Tab_Monaco() {
    return (
        <div className="flex flex-col gap-4">
            <FontFamilyRow />
            <FontSizeRow />
            <MinimapRow />
        </div>
    );
}

function FontFamilyRow() {
    const { monaco } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>
                Font family
            </Label>

            <Input id={id} className="h-7 w-56 text-xs" value={monaco.fontFamily} placeholder={"Consolas, 'Courier New', monospace"} onChange={(e) => { appSettings.monaco.fontFamily = e.target.value; }} />
        </div>
    );
}

function FontSizeRow() {
    const { monaco } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>
                Font size
            </Label>

            <div className="flex items-center gap-3">
                <Slider id={id} className="w-36" min={6} max={24} step={1} value={[monaco.fontSize]} onValueChange={([v]) => { appSettings.monaco.fontSize = v; }} />
                <span className="w-10 text-right tabular-nums text-muted-foreground">{monaco.fontSize} px</span>
            </div>
        </div>
    );
}

function MinimapRow() {
    const { monaco } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>
                Show minimap
            </Label>

            <Switch id={id} checked={monaco.minimap} onCheckedChange={(v) => { appSettings.monaco.minimap = v; }} />
        </div>
    );
}
