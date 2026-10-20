import { Command, EllipsisVertical, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { islandButtonClasses } from "@/ui/local-ui/9-island";
import { CommandMenuItem } from "./1-8-menu-item-as-command";

/** Tools that do not deserve a toolbar slot. Object commands live in the canvas right-click menu. */
export function MoreMenu() {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={islandButtonClasses} title="More tools">
                <EllipsisVertical className="size-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
                <CommandMenuItem id="help.palette" icon={<Command className={ic} />} />
                <CommandMenuItem id="help.find" icon={<Search className={ic} />} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const ic = "size-4";
