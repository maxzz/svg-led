import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ui/shadcn/dropdown-menu";
import { BringToFront, Copy, EllipsisVertical, Frame, Group, SendToBack, Spline, Trash, Ungroup } from "lucide-react";
import { islandButtonClasses } from "@/ui/local-ui/9-island";
import { CommandMenuItem } from "./8-command-menu-item";

/** Object commands that do not deserve a toolbar slot */
export function MoreMenu() {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={islandButtonClasses} title="More actions">
                <EllipsisVertical className="size-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
                <CommandMenuItem id="object.convertToPath" icon={<Spline className={ic} />} />
                <CommandMenuItem id="viewbox.fitSelection" icon={<Frame className={ic} />} />
                <DropdownMenuSeparator />
                <CommandMenuItem id="object.group" icon={<Group className={ic} />} />
                <CommandMenuItem id="object.ungroup" icon={<Ungroup className={ic} />} />
                <DropdownMenuSeparator />
                <CommandMenuItem id="object.front" icon={<BringToFront className={ic} />} />
                <CommandMenuItem id="object.forward" />
                <CommandMenuItem id="object.backward" />
                <CommandMenuItem id="object.back" icon={<SendToBack className={ic} />} />
                <DropdownMenuSeparator />
                <CommandMenuItem id="edit.duplicate" icon={<Copy className={ic} />} />
                <CommandMenuItem id="edit.delete" icon={<Trash className={ic} />} variant="destructive" />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

const ic = "size-4";
