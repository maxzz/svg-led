import { Fragment, type ReactElement, type ReactNode } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { displayShortcut, getCommand, runCommandAtom } from "@/commands";
import { selectionAtom } from "@/store/4-editor";
import {
    ContextMenuCheckboxItem, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/ui/shadcn/context-menu";

/** Separator marker in an entry list */
export const SEP = { separator: true } as const;

/** One entry of a menu. Falsy values are hidden entries, so `cond && <Item />` works. */
export type MenuEntry = typeof SEP | ReactElement | false | null | undefined;

function isSeparator(entry: MenuEntry): entry is typeof SEP {
    return entry === SEP;
}

/**
 * Renders the visible entries. Separators that would start, end or double up a list are dropped,
 * so the menu stays tidy whatever subset of entries is visible for the context.
 */
export function renderEntries(entries: MenuEntry[]): ReactNode[] {
    const rv: ReactNode[] = [];
    let pendingSeparator = false;
    for (const entry of entries) {
        if (isSeparator(entry)) {
            pendingSeparator = rv.length > 0;
        } else if (entry) {
            if (pendingSeparator) {
                rv.push(<ContextMenuSeparator key={`sep-${rv.length}`} />);
                pendingSeparator = false;
            }
            rv.push(<Fragment key={`item-${rv.length}`}>{entry}</Fragment>);
        }
    }
    return rv;
}

/** Plain item with an action, icon and optional shortcut text */
export function ActionItem({ icon, label, shortcut, variant, disabled, onSelect }: {
    icon?: ReactNode;
    label: string;
    shortcut?: string;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
    onSelect: () => void;
}) {
    return (
        <ContextMenuItem variant={variant} disabled={disabled} onSelect={onSelect}>
            {icon}
            {label}
            {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
        </ContextMenuItem>
    );
}

/** Item bound to a command: label, shortcut and enabled state come from the command registry */
export function CommandItem({ id, label, icon, variant }: { id: string; label?: string; icon?: ReactNode; variant?: 'default' | 'destructive'; }) {
    useAtomValue(selectionAtom); // re-evaluate enabled state when the selection changes while the menu is open
    const store = useStore();
    const run = useSetAtom(runCommandAtom);

    const cmd = getCommand(id);
    if (!cmd) {
        return null;
    }
    const enabled = !cmd.enabled || cmd.enabled(store.get);

    return (
        <ActionItem
            icon={icon}
            label={label ?? cmd.label}
            shortcut={cmd.shortcut && displayShortcut(cmd.shortcut)}
            variant={variant}
            disabled={!enabled}
            onSelect={() => run(id)}
        />
    );
}

/** Checkbox item bound to a toggle command; `checked` is the current state, read by the caller */
export function CommandCheckItem({ id, label, checked }: { id: string; label: string; checked: boolean; }) {
    const run = useSetAtom(runCommandAtom);
    return (
        <ContextMenuCheckboxItem checked={checked} onCheckedChange={() => run(id)}>
            {label}
        </ContextMenuCheckboxItem>
    );
}

export function SubMenu({ icon, label, items }: { icon: ReactNode; label: string; items: MenuEntry[]; }) {
    return (
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                {icon}
                {label}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-52">
                {renderEntries(items)}
            </ContextMenuSubContent>
        </ContextMenuSub>
    );
}
