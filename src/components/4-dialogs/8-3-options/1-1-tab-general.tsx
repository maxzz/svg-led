import { useId, type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { appSettings, HintPlacement, SelectionMode, WelcomeTransition } from "@/store/1-ui-settings";
import { type ThemeMode } from "@/utils/theme-apply";
import { cn } from "@/utils/classnames";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Switch } from "@/ui/shadcn/switch";
import { OptionLabel } from "./8-option-label";

export function Tab_General() {
    return (
        <div className="flex flex-col gap-2">
            <SubHeader>Theme</SubHeader>
            <ThemeRow />
            <BackgroundRow />

            <SubHeader>Welcome page</SubHeader>
            <ShowWelcomeSwitch />
            <WelcomeTransitionSelect />

            <SubHeader>Canvas</SubHeader>
            <FitAvoidsPropertiesSwitch />
            <PinPropertiesSwitch />
            <HintPlacementSelect />
            <SelectionModeSelect />
        </div>
    );
}

function SubHeader({ children }: { children: ReactNode; }) {
    return (
        <div className="pt-2 text-muted-foreground border-b">
            {children}
        </div>
    );
}

//---------------------------------------------------------------------------

function ThemeRow() {
    const { theme } = useSnapshot(appSettings);
    return (
        <div className="flex items-center justify-between gap-4">
            <Label>Application theme</Label>
            <div className="p-0.5 bg-muted rounded-md flex gap-0.5">
                {THEMES.map(
                    ([mode, Icon, title]) => (
                        <button
                            className={cn("p-1 rounded", theme === mode ? "text-(--editor-accent) bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            title={title}
                            onClick={() => { appSettings.theme = mode; }}
                            type="button"
                            key={mode}
                        >
                            <Icon className="size-3.5" />
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

const THEMES: readonly (readonly [ThemeMode, typeof Sun, string])[] = [
    ['light', Sun, 'Light'],
    ['dark', Moon, 'Dark'],
    ['system', Monitor, 'System'],
];

//---------------------------------------------------------------------------

function BackgroundRow() {
    const { canvasBackground } = useSnapshot(appSettings);
    return (
        <div className="flex items-center justify-between gap-4">
            <Label>Canvas background</Label>
            <div className="flex items-center gap-1.5">
                {BACKGROUNDS.map((color) => (
                    <button
                        className={cn(
                            "size-6 ring-1 ring-foreground/15 rounded-md flex items-center justify-center",
                            canvasBackground === color && "ring-1 ring-offset-1 ring-(--editor-accent)",
                        )}
                        style={{ backgroundColor: color || undefined }}
                        title={color || 'Theme background'}
                        onClick={() => { appSettings.canvasBackground = color; }}
                        type="button"
                        key={color || 'theme'}
                    >
                        {!color && <RefreshCw className="size-3 text-muted-foreground" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

const BACKGROUNDS = ['', '#ffffff', '#f8f9fa', '#f5faff', '#fffce8', '#fdf8f6', '#1e1e1e', '#121212'];

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------

function PinPropertiesSwitch() {
    const { prefs } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip="Keep the Properties panel on screen when the selection changes or is cleared. It shows \"Nothing selected\" when there is nothing to edit. The same setting is the pin button in the panel header."
            >
                Pin Properties panel
            </OptionLabel>

            <Switch id={id} checked={prefs.pinProperties} onCheckedChange={(v) => { appSettings.prefs.pinProperties = v; }} />
        </div>
    );
}

//---------------------------------------------------------------------------

function HintPlacementSelect() {
    const { prefs } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip="Hint line that describes the active tool. Show it under the main toolbar, in the bottom row between the Zoom/Undo and Help islands, or hide it."
            >
                Tool hint
            </OptionLabel>

            <Select value={prefs.hintPlacement} onValueChange={(value) => { appSettings.prefs.hintPlacement = value as HintPlacement; }}>
                <SelectTrigger id={id} className="min-w-36" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    {HINT_PLACEMENT_ITEMS.map(
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

const HINT_PLACEMENT_ITEMS: readonly (readonly [label: string, value: HintPlacement])[] = [
    ["None", HintPlacement.none],
    ["Top", HintPlacement.top],
    ["Bottom", HintPlacement.bottom],
];

//---------------------------------------------------------------------------

function SelectionModeSelect() {
    const { prefs } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <OptionLabel
                htmlFor={id}
                tip={<>
                    <div><b>Inclusive:</b> a marquee selects only the elements that lie entirely inside it.</div>
                    <div><b>Exclusive:</b> a marquee selects every element it touches, even partly.</div>
                    <div>Hold <b>Ctrl</b> while dragging a marquee to use the opposite mode.</div>
                </>}
            >
                Marquee selection
            </OptionLabel>

            <Select value={prefs.selectionMode} onValueChange={(value) => { appSettings.prefs.selectionMode = value as SelectionMode; }}>
                <SelectTrigger id={id} className="min-w-36" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    {SELECTION_MODE_ITEMS.map(
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

const SELECTION_MODE_ITEMS: readonly (readonly [label: string, value: SelectionMode])[] = [
    ["Inclusive", SelectionMode.inclusive],
    ["Exclusive", SelectionMode.exclusive],
];

//---------------------------------------------------------------------------

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

//---------------------------------------------------------------------------
