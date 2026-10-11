import { useAtom, useSetAtom, useStore } from "jotai";
import { COMMANDS, COMMAND_GROUP_LABELS, type CommandGroup, displayShortcut } from "@/commands";
import { Command, CommandDialog, CommandEmpty, CommandGroup as CmdGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/ui/shadcn/command";
import { isOpenCommandPaletteAtom, runPaletteCommandAtom } from "./9-types-command-palette";

const GROUPS: CommandGroup[] = ['file', 'edit', 'object', 'viewbox', 'view', 'tools', 'help'];

export function CommandPalette() {
    const [isOpen, setIsOpen] = useAtom(isOpenCommandPaletteAtom);

    return (
        <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
            {isOpen && <Body />}
        </CommandDialog>
    );
}

function Body() {
    const store = useStore();
    const run = useSetAtom(runPaletteCommandAtom);

    return (
        <Command>
            <CommandInput placeholder="Type a command..." />
            <CommandList className="max-h-[60vh]">
                <CommandEmpty>No commands found.</CommandEmpty>
                {GROUPS.map(
                    (group) => {
                        const items = COMMANDS.filter((c) => c.group === group && c.id !== 'help.palette' && (!c.enabled || c.enabled(store.get)));
                        return items.length > 0 && (
                            <CmdGroup heading={COMMAND_GROUP_LABELS[group]} key={group}>
                                {items.map(
                                    (c) => (
                                        <CommandItem value={`${COMMAND_GROUP_LABELS[group]} ${c.label} ${c.keywords ?? ''}`} onSelect={() => run(c.id)} key={c.id}>
                                            {c.label}
                                            {c.shortcut && (
                                                <CommandShortcut>{displayShortcut(c.shortcut)}</CommandShortcut>
                                            )}
                                        </CommandItem>
                                    )
                                )}
                            </CmdGroup>
                        );
                    }
                )}
            </CommandList>
        </Command>
    );
}
