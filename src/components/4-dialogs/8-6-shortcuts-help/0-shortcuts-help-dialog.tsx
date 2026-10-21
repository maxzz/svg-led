import { Fragment, type ReactNode } from "react";
import { useAtom } from "jotai";
import { COMMANDS, COMMAND_GROUP_LABELS, type CommandGroup, displayShortcut } from "@/commands";
import { MODIFIERS, MODIFIER_DESCRIPTIONS, MODIFIER_LABELS, type Modifier, TOOLS, toolShortcuts } from "@/tools";
import { HintText } from "@/components/1-workspace/3-3-hint-panel/1-hint-text";
import { KeyText } from "@/ui/local-ui/9-key-text";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { isOpenShortcutsHelpDialogAtom } from "./9-types-shortcuts-help";

export function ShortcutsHelpDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenShortcutsHelpDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! w-[min(64rem,calc(100vw-2rem))]! max-w-5xl gap-0!" withScroll>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Help and keyboard shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-xs sr-only">
                        <HintText text="[Space]+drag or the middle mouse button pans · Wheel zooms · [Shift]+wheel scrolls sideways · Double-click a group to enter it, or an element to edit its points" />
                    </DialogDescription>
                </DialogHeader>


                <div className="px-4 py-4 max-h-[90vh] md:grid-cols-2 overflow-auto grid grid-cols-1 gap-x-6 gap-y-4 items-start">
                    <div className="flex flex-col gap-4">
                        <ShortcutIsland caption="Tools">
                            {TOOLS.map(
                                (tool) => <ShortcutRow label={tool.label} shortcuts={toolShortcuts(tool)} key={tool.id} />
                            )}
                        </ShortcutIsland>

                        <ShortcutIsland caption="View & help">
                            {VIEW_GROUPS.map(
                                (group) => <ShortcutGroup group={group} key={group} />
                            )}
                        </ShortcutIsland>

                    </div>

                    <div className="flex flex-col gap-4">
                        <ShortcutIsland caption="Editor">
                            {EDITOR_GROUPS.map(
                                (group) => <ShortcutGroup group={group} key={group} />
                            )}
                        </ShortcutIsland>

                        <ShortcutIsland caption="Modifier keys">
                            <ModifierRows />
                        </ShortcutIsland>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// * Click to select, Shift+click to add, drag to move (Alt+drag copies), double-click a group to enter it, Ctrl+click to select inside a group, double-click an element to edit points
// * Space+drag or the middle mouse button pans; the wheel zooms, Shift+wheel scrolls sideways. Double-click an element to edit its points.

//---------------------------------------------------------------------------

const EDITOR_GROUPS: CommandGroup[] = ['file', 'edit', 'object'];
const VIEW_GROUPS: CommandGroup[] = ['view', 'viewbox', 'help'];

/** A bordered card with a caption, like the islands of the Excalidraw help dialog */
function ShortcutIsland({ caption, children }: { caption: string; children: ReactNode; }) {
    return (
        <section className="p-3 border rounded-lg flex flex-col gap-3">
            <h3 className="text-xs font-semibold">{caption}</h3>
            {children}
        </section>
    );
}

function ShortcutGroup({ group }: { group: CommandGroup; }) {
    const items = COMMANDS.filter((c) => c.group === group && c.shortcut);
    if (!items.length) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1.5">
            <h4 className="font-medium text-[11px]">{COMMAND_GROUP_LABELS[group]}</h4>
            {items.map(
                (c) => <ShortcutRow label={c.label} shortcuts={[c.shortcut!, ...(c.alsoKeys ?? [])]} key={c.id} />
            )}
        </div>
    );
}

/** One action, then each way to trigger it: "Redo  Ctrl Shift Z  or  Ctrl Y" */
function ShortcutRow({ label, shortcuts }: { label: string; shortcuts: string[]; }) {
    return (
        <div className="text-xs flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <div className="shrink-0 flex items-center gap-1">
                {shortcuts.map(
                    (shortcut, i) => (
                        <Fragment key={shortcut}>
                            {i > 0 && <span className="text-[10px] text-muted-foreground">or</span>}
                            {shortcut.split('+').map(
                                (key, j) => <KeyText key={j}>{displayShortcut(key)}</KeyText>
                            )}
                        </Fragment>
                    )
                )}
            </div>
        </div>
    );
}

function ModifierRows() {
    return (<>
        {(Object.keys(MODIFIERS) as (keyof typeof MODIFIERS)[]).map(
            (group) => (
                <div className="flex flex-col gap-1.5" key={group}>
                    <h4 className="font-medium text-[11px]">
                        {MODIFIER_GROUP_LABELS[group]}
                    </h4>
                    {Object.entries(MODIFIERS[group]).map(
                        ([key, mod]) => (
                            <div className="text-xs flex items-baseline gap-2" key={key}>
                                <KeyText>{displayShortcut(MODIFIER_LABELS[mod as Modifier])}</KeyText>
                                <span className="text-muted-foreground">{(MODIFIER_DESCRIPTIONS[group] as Record<string, string>)[key]}</span>
                            </div>
                        )
                    )}
                </div>
            )
        )}
    </>);
}

const MODIFIER_GROUP_LABELS: Record<keyof typeof MODIFIERS, string> = {
    select: 'Selection tool',
    points: 'Edit points tool',
    shapes: 'Shape tools',
    pen: 'Pen tool',
};
