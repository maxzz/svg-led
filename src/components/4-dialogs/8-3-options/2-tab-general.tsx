import { useId } from "react";
import { useSnapshot } from "valtio";
import { appSettings, WelcomeTransition } from "@/store/1-ui-settings";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";

export function Tab_General() {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-muted-foreground">Welcome page</div>
            <ShowWelcomeSwitch />
            <WelcomeTransitionSelect />
        </div>
    );
}

function ShowWelcomeSwitch() {
    const { showWelcome } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>
                Show Welcome page at startup
            </Label>

            <Switch id={id} checked={showWelcome} onCheckedChange={(v) => { appSettings.showWelcome = v; }} />
        </div>
    );
}

function WelcomeTransitionSelect() {
    const { welcomeTransition } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>
                Welcome page transition
            </Label>

            <Select value={welcomeTransition} onValueChange={(value) => { appSettings.welcomeTransition = value as WelcomeTransition; }}>
                <SelectTrigger id={id} className="min-w-36" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    {TRANSITION_ITEMS.map(
                        ([label, value]) => (
                            <SelectItem value={value} key={value}>
                                {label}
                            </SelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}

const TRANSITION_ITEMS: readonly (readonly [label: string, value: WelcomeTransition])[] = [
    ["Split into quarters", WelcomeTransition.quadrants],
    ["Sliding doors", WelcomeTransition.doors],
];
