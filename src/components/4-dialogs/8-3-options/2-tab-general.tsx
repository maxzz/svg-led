import { useId } from "react";
import { useSnapshot } from "valtio";
import { appSettings, WelcomeTransition } from "@/store/1-ui-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { OptionLabel } from "./3-option-label";

export function Tab_General() {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-muted-foreground">Welcome page</div>
            <ShowWelcomeSwitch />
            <WelcomeTransitionSelect />

            <div className="pt-2 text-muted-foreground">Canvas</div>
            <FitAvoidsPropertiesSwitch />
        </div>
    );
}

function ShowWelcomeSwitch() {
    const { showWelcome } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel htmlFor={id}>
                Show Welcome page at startup
            </OptionLabel>

            <Switch id={id} checked={showWelcome} onCheckedChange={(v) => { appSettings.showWelcome = v; }} />
        </div>
    );
}

function FitAvoidsPropertiesSwitch() {
    const { prefs } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip="When using Zoom to fit all, leave room for the Properties panel. The drawing is centered in the space to the right of the panel. Useful when the editor occupies only part of the screen."
            >
                Zoom to fit respects Properties panel
            </OptionLabel>

            <Switch id={id} checked={prefs.fitAvoidsProperties} onCheckedChange={(v) => { appSettings.prefs.fitAvoidsProperties = v; }} />
        </div>
    );
}

function WelcomeTransitionSelect() {
    const { welcomeTransition } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip={<>
                    <div><b>Split into quarters:</b> the Welcome page splits into four quarters that fly out to the corners.</div>
                    <div><b>Sliding doors:</b> the Welcome page parts in the middle like a pair of sliding doors.</div>
                </>}
            >
                Welcome page transition
            </OptionLabel>

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
