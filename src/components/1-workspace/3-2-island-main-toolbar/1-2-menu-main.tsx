import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Download, SlidersHorizontal, FolderOpen, GitFork, CircleQuestionMark, ImageDown, Menu, Save, Settings2, ClipboardPaste, Trash } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { pointsOptionsAtom } from "@/tools/tool-3-points/options";
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
    DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/ui/shadcn/dropdown-menu";
import { islandButtonClasses } from "@/ui/local-ui/9-island";
import { CommandMenuItem } from "./1-8-menu-item-as-command";
import { IconAppLogo } from "@/ui/icons/normal/svg-led/app-logo";
import { MainPage, navigateToPageAtom } from "../../5-welcome/a-ui-app-page";

export function Island_MainMenu() {
    const navigate = useSetAtom(navigateToPageAtom);
    const showWelcome = () => navigate(MainPage.welcome);

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={islandButtonClasses} title="Main menu">
                <Menu className="size-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
                <CommandMenuItem id="file.open" icon={<FolderOpen className={icClasses} />} />
                <CommandMenuItem id="file.save" icon={<Save className={icClasses} />} />
                <CommandMenuItem id="file.saveAs" icon={<Download className={icClasses} />} />

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <ImageDown className={icClasses} />
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

                {/* <CommandMenuItem id="file.pasteSvg" icon={<ClipboardPaste className={ic} />} /> */}

                <DropdownMenuSeparator />
                <CommandMenuItem id="file.reset" icon={<Trash className={icClasses} />} />

                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => showWelcome()}>
                    <IconAppLogo className={icClasses} />
                    Welcome page
                </DropdownMenuItem>
                <CommandMenuItem id="help.shortcuts" icon={<CircleQuestionMark className={icClasses} />} label="Help" />
                <DropdownMenuItem asChild>
                    <a href="https://github.com/maxzz/svg-led" target="_blank" rel="noreferrer">
                        <GitFork className={icClasses} />
                        GitHub
                    </a>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <PreferencesSub />
                <CommandMenuItem id="help.options" icon={<Settings2 className={icClasses} />} label="More options..." />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const icClasses = "size-4";

function PreferencesSub() {
    const { prefs } = useSnapshot(appSettings);
    const pointsOptions = useAtomValue(pointsOptionsAtom);
    const setPointsOptions = useSetAtom(pointsOptionsAtom);

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <SlidersHorizontal className={icClasses} />
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
                <DropdownMenuCheckboxItem checked={prefs.snapToObjects} onSelect={keepOpen} onCheckedChange={(v) => { appSettings.prefs.snapToObjects = !!v; }}>
                    Snap to objects
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
