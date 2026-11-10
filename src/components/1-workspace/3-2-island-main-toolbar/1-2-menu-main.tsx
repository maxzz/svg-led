import { useSetAtom } from "jotai";
import { Download, SlidersHorizontal, FolderOpen, GitFork, CircleQuestionMark, ImageDown, Menu, Save, Settings2, ClipboardPaste, Trash } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
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
                <CommandMenuItem id="viewbox.settings" icon={<SlidersHorizontal className={icClasses} />} />
                <CommandMenuItem id="help.options" icon={<Settings2 className={icClasses} />} label="More options..." />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const icClasses = "size-4";
