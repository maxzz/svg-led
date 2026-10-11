import { useAtom } from "jotai";
import { COMMANDS, COMMAND_GROUP_LABELS, type CommandGroup, displayShortcut } from "@/commands";
import { MODIFIERS, MODIFIER_DESCRIPTIONS, MODIFIER_LABELS, type Modifier } from "@/tools";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { isOpenShortcutsHelpDialogAtom } from "./9-types-shortcuts-help";

export function ShortcutsHelpDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenShortcutsHelpDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-3xl! gap-0!" withScroll>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Help and keyboard shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Space+drag or the middle mouse button pans; the wheel zooms, Shift+wheel scrolls sideways.
                        Double-click an element to edit its points.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 max-h-[70vh] md:grid-cols-2 overflow-auto grid grid-cols-1 gap-x-8 gap-y-5">
                    {SHORTCUT_GROUPS.map(
                        (group) => <ShortcutGroup group={group} key={group} />
                    )}
                    <ModifiersSection />
                </div>
            </DialogContent>
        </Dialog>
    );
}

//---------------------------------------------------------------------------

const SHORTCUT_GROUPS: CommandGroup[] = ['tools', 'file', 'edit', 'object', 'viewbox', 'view', 'help'];

function ShortcutGroup({ group }: { group: CommandGroup; }) {
    const items = COMMANDS.filter((c) => c.group === group && c.shortcut);
    if (!items.length) {
        return null;
    }

    return (
        <section className="flex flex-col gap-1">
            <h3 className="mb-1 text-xs font-semibold">{COMMAND_GROUP_LABELS[group]}</h3>
            {items.map(
                (c) => (
                    <div className="text-xs flex items-center justify-between gap-4" key={c.id}>
                        <span className="text-muted-foreground">{c.label}</span>
                        <Kbd>{displayShortcut(c.shortcut!)}</Kbd>
                    </div>
                )
            )}
        </section>
    );
}

//---------------------------------------------------------------------------

function ModifiersSection() {
    return (
        <section className="md:col-span-2 flex flex-col gap-3">
            <h3 className="text-xs font-semibold">
                Modifier keys
            </h3>
            <div className="md:grid-cols-2 grid grid-cols-1 gap-x-8 gap-y-3">
                {(Object.keys(MODIFIERS) as (keyof typeof MODIFIERS)[]).map(
                    (group) => (
                        <div className="flex flex-col gap-1" key={group}>
                            <h4 className="font-medium text-[11px]">
                                {MODIFIER_GROUP_LABELS[group]}
                            </h4>
                            {Object.entries(MODIFIERS[group]).map(
                                ([key, mod]) => (
                                    <div className="text-xs flex items-baseline gap-2" key={key}>
                                        <Kbd>{MODIFIER_LABELS[mod as Modifier]}</Kbd>
                                        <span className="text-muted-foreground">{(MODIFIER_DESCRIPTIONS[group] as Record<string, string>)[key]}</span>
                                    </div>
                                )
                            )}
                        </div>
                    )
                )}
            </div>
        </section>
    );
}

const MODIFIER_GROUP_LABELS: Record<keyof typeof MODIFIERS, string> = {
    select: 'Selection tool',
    points: 'Edit points tool',
    shapes: 'Shape tools',
    pen: 'Pen tool',
};

function Kbd({ children }: { children: string; }) {
    return <kbd className="shrink-0 px-1.5 py-0.5 font-mono text-[10px] bg-muted border rounded">{children}</kbd>;
}
