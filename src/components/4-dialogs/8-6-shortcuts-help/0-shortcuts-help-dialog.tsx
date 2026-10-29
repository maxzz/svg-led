import { Fragment, type ReactNode, useState } from "react";
import { useAtom } from "jotai";
import { COMMANDS, COMMAND_GROUP_LABELS, type CommandGroup, displayShortcut } from "@/commands";
import { MODIFIERS, MODIFIER_DESCRIPTIONS, MODIFIER_LABELS, type Modifier, TOOLS, toolShortcuts } from "@/tools";
import { HintText } from "@/components/1-workspace/3-3-hint-panel/1-hint-text";
import { KeyText } from "@/ui/local-ui/9-key-text";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Input } from "@/ui/shadcn/input";
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
                        <HintText text="[Space]+drag or the middle mouse button pans · Wheel zooms · [Shift]+wheel scrolls sideways · Double-click a group to enter isolation mode" />
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <ShortcutsHelpBody />}
            </DialogContent>
        </Dialog>
    );
}

/** Mounted only while the dialog is open, so the search query starts empty each time */
function ShortcutsHelpBody() {
    const [query, setQuery] = useState('');

    const toolRows = filterRows(TOOL_ROWS, query);
    const viewSections = filterSections(VIEW_SECTIONS, query);
    const editorSections = filterSections(EDITOR_SECTIONS, query);
    const canvasRows = filterRows(CANVAS_ROWS, query);
    const modifierSections = filterSections(MODIFIER_SECTIONS, query);

    const isLeftEmpty = !toolRows.length && !viewSections.length;
    const isRightEmpty = !editorSections.length && !canvasRows.length && !modifierSections.length;

    return (<>
        <div className="px-4 py-2 border-b">
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by command name or key combination, e.g. 'zoom' or 'Ctrl+Z'"
                aria-label="Search shortcuts"
                autoFocus
            />
        </div>

        {isLeftEmpty && isRightEmpty
            ? (
                <div className="px-4 py-8 text-xs text-center text-muted-foreground">
                    No commands match "{query}"
                </div>
            )
            : (
                <div className="px-4 py-4 max-h-[90vh] md:grid-cols-2 overflow-auto grid grid-cols-1 gap-x-6 gap-y-4 items-start">
                    {!isLeftEmpty && (
                        <div className="flex flex-col gap-4">
                            {!!toolRows.length && (
                                <ShortcutIsland caption="Tools">
                                    <ShortcutRows rows={toolRows} />
                                </ShortcutIsland>
                            )}

                            {!!viewSections.length && (
                                <ShortcutIsland caption="View & help">
                                    <ShortcutSections sections={viewSections} />
                                </ShortcutIsland>
                            )}
                        </div>
                    )}

                    {!isRightEmpty && (
                        <div className="flex flex-col gap-4">
                            {!!editorSections.length && (
                                <ShortcutIsland caption="Editor">
                                    <ShortcutSections sections={editorSections} />
                                </ShortcutIsland>
                            )}

                            {!!canvasRows.length && (
                                <ShortcutIsland caption="Canvas and other keys">
                                    <ShortcutRows rows={canvasRows} />
                                </ShortcutIsland>
                            )}

                            {!!modifierSections.length && (
                                <ShortcutIsland caption="Modifier keys">
                                    <ShortcutSections sections={modifierSections} modifiers />
                                </ShortcutIsland>
                            )}
                        </div>
                    )}
                </div>
            )
        }
    </>);
}

// * Click to select, Shift+click to add, drag to move (Alt+drag copies), double-click a group to enter isolation mode, Ctrl+click to select inside a group
// * Space+drag or the middle mouse button pans; the wheel zooms, Shift+wheel scrolls sideways.

//---------------------------------------------------------------------------

type ShortcutRowData = { id: string; label: string; shortcuts: string[]; };
type ShortcutSectionData = { id: string; heading: string; rows: ShortcutRowData[]; };

/** Lowercase, without spaces and '+', with Mac symbols spelled out, so 'Ctrl+Shift+Z', 'ctrl shift z' and '⌘⇧Z' compare equal */
function normalizeKeys(text: string): string {
    return text.toLowerCase().replace(/⌘/g, 'ctrl').replace(/⌥/g, 'alt').replace(/⇧/g, 'shift').replace(/[\s+]/g, '');
}

function rowMatches(row: ShortcutRowData, query: string): boolean {
    const text = query.trim().toLowerCase();
    if (!text || row.label.toLowerCase().includes(text)) {
        return true;
    }
    const keys = normalizeKeys(text);
    return !!keys && row.shortcuts.some((shortcut) => normalizeKeys(shortcut).includes(keys));
}

function filterRows(rows: ShortcutRowData[], query: string): ShortcutRowData[] {
    return rows.filter((row) => rowMatches(row, query));
}

/** A section whose heading matches keeps all its rows; otherwise only the matching rows, and empty sections are dropped */
function filterSections(sections: ShortcutSectionData[], query: string): ShortcutSectionData[] {
    const text = query.trim().toLowerCase();
    return sections
        .map((section) => (text && section.heading.toLowerCase().includes(text) ? section : { ...section, rows: filterRows(section.rows, query) }))
        .filter((section) => section.rows.length);
}

//---------------------------------------------------------------------------

const TOOL_ROWS: ShortcutRowData[] = TOOLS.map(
    (tool) => ({ id: tool.id, label: tool.label, shortcuts: toolShortcuts(tool) })
);

function commandSections(groups: CommandGroup[]): ShortcutSectionData[] {
    return groups.map(
        (group) => ({
            id: group,
            heading: COMMAND_GROUP_LABELS[group],
            rows: COMMANDS
                .filter((c) => c.group === group && c.shortcut)
                .map((c) => ({ id: c.id, label: c.label, shortcuts: [c.shortcut!, ...(c.alsoKeys ?? [])] })),
        })
    ).filter((section) => section.rows.length);
}

const EDITOR_SECTIONS = commandSections(['file', 'edit', 'object']);
const VIEW_SECTIONS = commandSections(['view', 'viewbox', 'help']);

/** Keys and mouse actions that are not commands (they are handled by tools, controllers or dialogs), so the command list does not show them */
const CANVAS_ROWS: ShortcutRowData[] = [
    { label: 'Copy the selection as SVG', shortcuts: ['Ctrl+C'] },
    { label: 'Cut the selection as SVG', shortcuts: ['Ctrl+X'] },
    { label: 'Paste SVG markup from the clipboard', shortcuts: ['Ctrl+V'] },
    { label: 'Pan: hold Space and drag, or drag with the middle mouse button', shortcuts: ['Space'] },
    { label: 'Zoom around the pointer (Ctrl+wheel zooms faster)', shortcuts: ['Wheel'] },
    { label: 'Scroll sideways', shortcuts: ['Shift+Wheel'] },
    { label: 'Nudge the selection by 1 (in Points: move the selected anchors)', shortcuts: ['Arrows'] },
    { label: 'Nudge the selection by 10', shortcuts: ['Shift+Arrows'] },
    { label: 'Back to Select, then leave isolation, then clear the selection', shortcuts: ['Esc'] },
    { label: 'Delete the selection (in Points: the selected anchors)', shortcuts: ['Delete', 'Backspace'] },
    { label: 'Pen: remove the last point while drawing', shortcuts: ['Backspace', 'Delete'] },
    { label: 'Pen: finish the path', shortcuts: ['Enter', 'Esc'] },
    { label: 'Double-click a group to isolate it; double-click empty canvas to leave one level', shortcuts: ['Double-click'] },
    { label: 'Scraps list: move between scraps', shortcuts: ['Arrows', 'Home', 'End'] },
    { label: 'Scraps list: load the selected scrap', shortcuts: ['Enter'] },
].map((row) => ({ ...row, id: row.label }));

const MODIFIER_GROUP_LABELS: Record<keyof typeof MODIFIERS, string> = {
    select: 'Selection tool',
    points: 'Edit points tool',
    shapes: 'Shape tools',
    pen: 'Pen tool',
};

const MODIFIER_SECTIONS: ShortcutSectionData[] = (Object.keys(MODIFIERS) as (keyof typeof MODIFIERS)[]).map(
    (group) => ({
        id: group,
        heading: MODIFIER_GROUP_LABELS[group],
        rows: Object.entries(MODIFIERS[group]).map(
            ([key, mod]) => ({
                id: key,
                label: (MODIFIER_DESCRIPTIONS[group] as Record<string, string>)[key],
                shortcuts: [MODIFIER_LABELS[mod as Modifier]],
            })
        ),
    })
);

//---------------------------------------------------------------------------

/** A bordered card with a caption, like the islands of the Excalidraw help dialog */
function ShortcutIsland({ caption, children }: { caption: string; children: ReactNode; }) {
    return (
        <section className="p-3 border rounded-lg flex flex-col gap-3">
            <h3 className="text-xs font-semibold">{caption}</h3>
            {children}
        </section>
    );
}

/** A bordered list whose items are separated by horizontal lines */
function ShortcutList({ children }: { children: ReactNode; }) {
    return (
        <div className="flex flex-col divide-y rounded-md border">
            {children}
        </div>
    );
}

/** A section heading placed above its list of items */
function ShortcutSectionHeading({ children }: { children: ReactNode; }) {
    return (
        <h4 className="font-semibold text-xs">{children}</h4>
    );
}

function ShortcutRows({ rows }: { rows: ShortcutRowData[]; }) {
    return (
        <ShortcutList>
            {rows.map(
                (row) => <ShortcutRow label={row.label} shortcuts={row.shortcuts} key={row.id} />
            )}
        </ShortcutList>
    );
}

/** Modifier rows put the key first: "Shift  click to add or remove an element from the selection" */
function ShortcutSections({ sections, modifiers }: { sections: ShortcutSectionData[]; modifiers?: boolean; }) {
    return (<>
        {sections.map(
            (section) => (
                <div className="flex flex-col gap-1.5" key={section.id}>
                    <ShortcutSectionHeading>{section.heading}</ShortcutSectionHeading>
                    {modifiers
                        ? (
                            <ShortcutList>
                                {section.rows.map(
                                    (row) => <ModifierRow label={row.label} modifier={row.shortcuts[0]} key={row.id} />
                                )}
                            </ShortcutList>
                        )
                        : <ShortcutRows rows={section.rows} />
                    }
                </div>
            )
        )}
    </>);
}

/** One action, then each way to trigger it: "Redo  Ctrl Shift Z  or  Ctrl Y" */
function ShortcutRow({ label, shortcuts }: { label: string; shortcuts: string[]; }) {
    return (
        <div className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-4">
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

function ModifierRow({ label, modifier }: { label: string; modifier: string; }) {
    return (
        <div className="px-2.5 py-1.5 text-xs flex items-baseline gap-2">
            <KeyText>{displayShortcut(modifier)}</KeyText>
            <span className="text-muted-foreground">{label}</span>
        </div>
    );
}
