import { type ReactNode } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { selectionAtom } from "@/store/4-editor";
import { displayShortcut, getCommand, runCommandAtom } from "@/commands";
import { DropdownMenuItem, DropdownMenuShortcut } from "@/ui/shadcn/dropdown-menu";

/** Dropdown item bound to a command: label, shortcut and enabled state come from the registry */
export function CommandMenuItem({ id, icon, label, variant }: { id: string; icon?: ReactNode; label?: string; variant?: "default" | "destructive"; }) {
    useAtomValue(selectionAtom); // re-evaluate enabled state when the selection changes while the menu is open
    const store = useStore();
    const run = useSetAtom(runCommandAtom);

    const cmd = getCommand(id);
    if (!cmd) {
        return null;
    }
    const enabled = !cmd.enabled || cmd.enabled(store.get);

    return (
        <DropdownMenuItem disabled={!enabled} variant={variant} onSelect={() => run(id)}>
            {icon}
            {label ?? cmd.label}
            {cmd.shortcut && <DropdownMenuShortcut>{displayShortcut(cmd.shortcut)}</DropdownMenuShortcut>}
        </DropdownMenuItem>
    );
}
