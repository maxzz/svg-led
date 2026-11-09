import { type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/ui/shadcn/context-menu";
import { ActionItem, type MenuEntry, SEP, renderEntries } from "../../1-canvas/4-context-menu/8-context-menu-ui";
import { layersMenuItemsAtom, openLayersMenuAtom, runLayersMenuCommandAtom } from "./9-atoms-layers-menu";

/**
 * One context menu for every row of the tree. A right-click resolves the row under the pointer (see `openLayersMenuAtom`)
 * before Radix opens the menu, so the content lists the commands registered for that row's kind.
 */
export function LayersContextMenu({ children }: { children: ReactNode; }) {
    const open = useSetAtom(openLayersMenuAtom);
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div onContextMenu={(e) => { !open(e.target as Element) && e.preventDefault(); }}>
                    {children}
                </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-48">
                <LayersMenuItems />
            </ContextMenuContent>
        </ContextMenu>
    );
}

/** Rendered only while the menu is open, so the items are not recomputed on every document change */
function LayersMenuItems() {
    const items = useAtomValue(layersMenuItemsAtom);
    const run = useSetAtom(runLayersMenuCommandAtom);

    const entries: MenuEntry[] = [];
    items.forEach(({ command: { id, label, icon: Icon, section, destructive }, enabled }, i) => {
        i > 0 && items[i - 1].command.section !== section && entries.push(SEP);
        entries.push(
            <ActionItem
                icon={<Icon className="size-4" />}
                label={label}
                variant={destructive ? 'destructive' : 'default'}
                disabled={!enabled}
                onSelect={() => run(id)}
            />
        );
    });
    return <>{renderEntries(entries)}</>;
}
