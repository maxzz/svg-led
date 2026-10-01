import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Command, Download, SlidersHorizontal, FolderOpen, GitFork, CircleQuestionMark, ImageDown, Menu, Monitor, Moon, RefreshCw, Save, Search, Settings2, Sun, ClipboardPaste, Trash } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { type ThemeMode } from "@/utils/theme-apply";
import { pointsOptionsAtom } from "@/tools/points/options";
import { cn } from "@/utils/classnames";
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
    DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/ui/shadcn/dropdown-menu";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { CommandMenuItem } from "./8-command-menu-item";

const ic = "size-4";

export function MainMenu() {
    return (
        <DropdownMenu modal={false}>
            <Island className="pointer-events-auto">
                <DropdownMenuTrigger className={islandButtonClasses} title="Main menu">
                    <Menu className="size-4" />
                </DropdownMenuTrigger>
            </Island>

            <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
                <CommandMenuItem id="file.open" icon={<FolderOpen className={ic} />} />
                <CommandMenuItem id="file.save" icon={<Save className={ic} />} />
                <CommandMenuItem id="file.saveAs" icon={<Download className={ic} />} />

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <ImageDown className={ic} />
                        Export image
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <CommandMenuItem id="file.exportSvg" />
                        <CommandMenuItem id="file.exportPng1" />
                        <CommandMenuItem id="file.exportPng2" />
                        <CommandMenuItem id="file.exportPng4" />
                        <DropdownMenuSeparator />
                        <CommandMenuItem id="file.copySource" />
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <CommandMenuItem id="file.pasteSvg" icon={<ClipboardPaste className={ic} />} />

                <DropdownMenuSeparator />
                <CommandMenuItem id="help.palette" icon={<Command className={ic} />} />
                <CommandMenuItem id="help.find" icon={<Search className={ic} />} />
                <CommandMenuItem id="help.shortcuts" icon={<CircleQuestionMark className={ic} />} label="Help" />
                <CommandMenuItem id="file.reset" icon={<Trash className={ic} />} />

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <a href="https://github.com/maxzz/svg-led" target="_blank" rel="noreferrer">
                        <GitFork className={ic} />
                        GitHub
                    </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <PreferencesSub />
                <CommandMenuItem id="help.options" icon={<Settings2 className={ic} />} label="More options..." />

                <DropdownMenuSeparator />
                <ThemeRow />
                <BackgroundRow />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function PreferencesSub() {
    const { prefs } = useSnapshot(appSettings);
    const pointsOptions = useAtomValue(pointsOptionsAtom);
    const setPointsOptions = useSetAtom(pointsOptionsAtom);

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <SlidersHorizontal className={ic} />
                Preferences
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="min-w-56">
                <DropdownMenuCheckboxItem checked={prefs.showViewBox} onSelect={keepOpen} onCheckedChange={(v) => { appSettings.prefs.showViewBox = !!v; }}>
                    Show viewBox
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={prefs.showGrid} onSelect={keepOpen} onCheckedChange={(v) => { appSettings.prefs.showGrid = !!v; }}>
                    Show grid
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={prefs.snapToGrid} onSelect={keepOpen} onCheckedChange={(v) => { appSettings.prefs.snapToGrid = !!v; }}>
                    Snap to grid
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={pointsOptions.showAllHandles} onSelect={keepOpen} onCheckedChange={(v) => setPointsOptions({ showAllHandles: !!v })}>
                    Show all control handles
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Grid size</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(prefs.gridSize)} onValueChange={(v) => { appSettings.prefs.gridSize = Number(v); }}>
                    {GRID_SIZES.map((n) => <DropdownMenuRadioItem value={String(n)} onSelect={keepOpen} key={n}>{n}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Number precision</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(prefs.precision)} onValueChange={(v) => { appSettings.prefs.precision = Number(v); }}>
                    {PRECISIONS.map((n) => <DropdownMenuRadioItem value={String(n)} onSelect={keepOpen} key={n}>{n} decimals</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
}

const GRID_SIZES = [1, 5, 8, 10, 16, 20, 32];
const PRECISIONS = [0, 1, 2, 3, 4];

const keepOpen = (e: Event) => e.preventDefault();

function ThemeRow() {
    const { theme } = useSnapshot(appSettings);
    return (
        <div className="px-2 py-1.5 text-sm flex items-center justify-between">
            Theme
            <div className="p-0.5 bg-muted rounded-md flex gap-0.5">
                {THEMES.map(([mode, Icon, title]) => (
                    <button
                        className={cn("p-1 rounded", theme === mode ? "text-(--editor-accent) bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        title={title}
                        onClick={() => { appSettings.theme = mode; }}
                        type="button"
                        key={mode}
                    >
                        <Icon className="size-3.5" />
                    </button>
                ))}
            </div>
        </div>
    );
}

const THEMES: readonly (readonly [ThemeMode, typeof Sun, string])[] = [
    ['light', Sun, 'Light'],
    ['dark', Moon, 'Dark'],
    ['system', Monitor, 'System'],
];

function BackgroundRow() {
    const { canvasBackground } = useSnapshot(appSettings);
    return (
        <div className="px-2 py-1.5 text-sm flex flex-col gap-1.5">
            Canvas background
            <div className="flex items-center gap-1.5">
                {BACKGROUNDS.map((color) => (
                    <button
                        className={cn(
                            "size-6 ring-1 ring-foreground/15 rounded-md flex items-center justify-center",
                            canvasBackground === color && "ring-2 ring-(--editor-accent)",
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
